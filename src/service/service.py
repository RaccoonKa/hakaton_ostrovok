import inspect
import json
import logging
import warnings
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any, cast
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.routing import APIRoute
from langchain_core._api import LangChainBetaWarning
from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
    ToolMessage,
)
from langchain_core.runnables import RunnableConfig
from langfuse import Langfuse
from langfuse.langchain import CallbackHandler
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command, Interrupt
from langsmith import uuid7

from agents import DEFAULT_AGENT, get_agent, get_all_agent_info, load_agent
from core import settings
from memory import init_db_and_seed, initialize_database, initialize_store, user_storage
from schema import (
    ChatHistory,
    ChatHistoryInput,
    ChatMessage,
    ServiceMetadata,
    StreamInput,
    ThreadSummary,
    UserInput,
    UserThreads,
    UserThreadsInput,
)
from service.agui import router as agui_router
from service.auth_router import router as auth_router
from service.dependencies import CurrentUser, get_current_user
from service.threads import list_user_threads
from service.utils import (
    convert_message_content_to_string,
    ensure_model_available,
    langchain_to_chat_message,
    messages_from_checkpoint,
    remove_tool_calls,
)

warnings.filterwarnings("ignore", category=LangChainBetaWarning)
logger = logging.getLogger(__name__)


def custom_generate_unique_id(route: APIRoute) -> str:
    return route.name


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        await init_db_and_seed()
        await user_storage.init_user_tables()
        async with initialize_database() as saver, initialize_store() as store:
            if hasattr(saver, "setup"):
                await saver.setup()
            if hasattr(store, "setup"):
                await store.setup()

            if not settings.AUTH_SECRET:
                logger.warning(
                    "AUTH_SECRET is not configured — running with fallback dev secrets."
                )

            agents = get_all_agent_info()
            for a in agents:
                try:
                    await load_agent(a.key)
                    logger.info(f"Agent loaded: {a.key}")
                except Exception as e:
                    logger.error(f"Failed to load agent {a.key}: {e}")

                agent = get_agent(a.key)
                agent.checkpointer = saver
                agent.store = store
            yield
    except Exception as e:
        logger.error(f"Error during database/store/agents initialization: {e}")
        raise


app = FastAPI(lifespan=lifespan, generate_unique_id_function=custom_generate_unique_id)
router = APIRouter(dependencies=[Depends(get_current_user)])
router.include_router(agui_router)


@app.get("/info", tags=["info"])
async def info() -> ServiceMetadata:
    models = list(settings.AVAILABLE_MODELS)
    models.sort()
    return ServiceMetadata(
        agents=get_all_agent_info(),
        models=models,
        default_agent=DEFAULT_AGENT,
        default_model=settings.DEFAULT_MODEL,
    )


async def _handle_input(
    user_input: UserInput,
    agent: CompiledStateGraph,
    agent_id: str,
    current_user: CurrentUser,
) -> tuple[dict[str, Any], UUID]:
    run_id = uuid7()
    thread_id = user_input.thread_id or str(uuid4())

    # Check thread ownership
    owner_id = await user_storage.get_thread_owner(thread_id)
    if owner_id and owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=404, detail="Thread not found")

    title = user_input.message[:60] if user_input.message else None
    actual_owner = await user_storage.claim_or_touch_thread(
        thread_id, owner_id or current_user.id, title=title
    )
    if actual_owner and actual_owner != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=404, detail="Thread not found")

    user_id = current_user.id
    configurable = {"thread_id": thread_id, "user_id": user_id}
    if user_input.model is not None:
        ensure_model_available(user_input.model)
        configurable["model"] = user_input.model

    callbacks: list[Any] = []
    if settings.LANGFUSE_TRACING:
        langfuse_handler = CallbackHandler()
        callbacks.append(langfuse_handler)

    if user_input.agent_config:
        reserved_keys = {"thread_id", "user_id", "model"}
        if overlap := reserved_keys & user_input.agent_config.keys():
            raise HTTPException(
                status_code=422,
                detail=f"agent_config contains reserved keys: {overlap}",
            )
        configurable.update(user_input.agent_config)

    config = RunnableConfig(
        configurable=configurable,
        metadata={"user_id": user_id, "agent_id": agent_id},
        run_id=run_id,
        callbacks=callbacks,
    )

    state = await agent.aget_state(config=config)

    interrupted_tasks = [
        task for task in state.tasks if hasattr(task, "interrupts") and task.interrupts
    ]

    input_data: Command | dict[str, Any]
    if interrupted_tasks:
        input_data = Command(resume=user_input.message)
    else:
        input_data = {"messages": [HumanMessage(content=user_input.message)]}

    kwargs = {
        "input": input_data,
        "config": config,
    }

    return kwargs, run_id


@router.post("/{agent_id}/invoke", operation_id="invoke_with_agent_id")
@router.post("/invoke")
async def invoke(
    user_input: UserInput,
    agent_id: str = DEFAULT_AGENT,
    current_user: CurrentUser = Depends(get_current_user),
) -> ChatMessage:
    agent: CompiledStateGraph = get_agent(agent_id)
    kwargs, run_id = await _handle_input(user_input, agent, agent_id, current_user)

    try:
        stream_mode_arg: Any = ["updates", "values"]
        response_events = cast(
            list[tuple[str, Any]],
            await agent.ainvoke(**kwargs, stream_mode=stream_mode_arg),
        )
        response_type, response = response_events[-1]
        if "__interrupt__" in response:
            output = langchain_to_chat_message(
                AIMessage(content=response["__interrupt__"][0].value)
            )
        elif response_type == "values":
            output = langchain_to_chat_message(response["messages"][-1])
        else:
            raise ValueError(f"Unexpected response type: {response_type}")

        output.run_id = str(run_id)
        try:
            cfg = kwargs.get("config")
            if cfg is not None:
                state_snapshot = await agent.aget_state(config=cfg)
                if state_opts := state_snapshot.values.get("trip_options"):
                    output.custom_data = {**output.custom_data, "trip_options": state_opts}
        except Exception:
            pass
        return output
    except Exception as e:
        logger.error(f"An exception occurred: {e}")
        raise HTTPException(status_code=500, detail="Unexpected error")


async def message_generator(
    user_input: StreamInput,
    agent_id: str = DEFAULT_AGENT,
    current_user: CurrentUser | None = None,
    prepared_kwargs: tuple[dict[str, Any], UUID] | None = None,
) -> AsyncGenerator[str, None]:
    if prepared_kwargs is not None:
        kwargs, run_id = prepared_kwargs
        agent: CompiledStateGraph = get_agent(agent_id)
    else:
        if current_user is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        agent = get_agent(agent_id)
        kwargs, run_id = await _handle_input(user_input, agent, agent_id, current_user)

    try:
        stream_mode_arg: Any = ["updates", "messages", "custom"]
        async for stream_event in agent.astream(
            **kwargs, stream_mode=stream_mode_arg, subgraphs=True
        ):
            if not isinstance(stream_event, tuple):
                continue
            if len(stream_event) == 3:
                _, stream_mode, event = stream_event
            else:
                stream_mode, event = stream_event
            new_messages: list[Any] = []
            if stream_mode == "updates":
                for node, updates in event.items():
                    if node == "__interrupt__":
                        interrupt: Interrupt
                        for interrupt in updates:
                            new_messages.append(AIMessage(content=interrupt.value))
                        continue
                    updates = updates or {}
                    update_messages = updates.get("messages", [])
                    node_trip_options = updates.get("trip_options")
                    node_selected_option = updates.get("selected_option")
                    if (node_trip_options or node_selected_option) and update_messages:
                        for um in update_messages:
                            if isinstance(um, AIMessage):
                                um_kwargs = dict(getattr(um, "additional_kwargs", None) or {})
                                if node_trip_options and "trip_options" not in um_kwargs:
                                    um_kwargs["trip_options"] = node_trip_options
                                if node_selected_option and "selected_option" not in um_kwargs:
                                    um_kwargs["selected_option"] = node_selected_option
                                um.additional_kwargs = um_kwargs
                    if "supervisor" in node or "sub-agent" in node:
                        if isinstance(update_messages[-1], ToolMessage):
                            if "sub-agent" in node and len(update_messages) > 1:
                                update_messages = update_messages[-2:]
                            else:
                                update_messages = [update_messages[-1]]
                        else:
                            update_messages = []
                    new_messages.extend(update_messages)

            if stream_mode == "custom":
                new_messages = [event]

            processed_messages = []
            current_message: dict[str, Any] = {}
            for message in new_messages:
                if isinstance(message, tuple):
                    key, value = message
                    current_message[key] = value
                else:
                    if current_message:
                        processed_messages.append(_create_ai_message(current_message))
                        current_message = {}
                    processed_messages.append(message)

            if current_message:
                processed_messages.append(_create_ai_message(current_message))

            for message in processed_messages:
                try:
                    chat_message = langchain_to_chat_message(message)
                    chat_message.run_id = str(run_id)
                except Exception as e:
                    logger.error(f"Error parsing message: {e}")
                    yield f"data: {json.dumps({'type': 'error', 'content': 'Unexpected error'})}\n\n"
                    continue
                if chat_message.type == "human" and chat_message.content == user_input.message:
                    continue
                yield f"data: {json.dumps({'type': 'message', 'content': chat_message.model_dump()})}\n\n"

            if stream_mode == "messages":
                if not user_input.stream_tokens:
                    continue
                msg, metadata = event
                if "skip_stream" in metadata.get("tags", []):
                    continue
                if not isinstance(msg, AIMessageChunk):
                    continue
                content = remove_tool_calls(msg.content)
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': convert_message_content_to_string(content)})}\n\n"

        # Check if state has trip_options or selected_option and emit as custom event if present
        try:
            cfg = kwargs.get("config")
            if cfg is not None:
                state_snapshot = await agent.aget_state(config=cfg)
                state_trip_opts = state_snapshot.values.get("trip_options")
                state_sel_opt = state_snapshot.values.get("selected_option")
                if state_trip_opts or state_sel_opt:
                    payload: dict[str, Any] = {}
                    if state_trip_opts:
                        payload["trip_options"] = state_trip_opts
                    if state_sel_opt:
                        payload["selected_option"] = state_sel_opt
                    yield f"data: {json.dumps({'type': 'message', 'content': {'type': 'custom', 'content': '', 'custom_data': payload}})}\n\n"
        except Exception as e:
            logger.debug("Failed to inspect final state for trip options: %s", e)
    except Exception as e:
        logger.error(f"Error in message generator: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': 'Internal server error'})}\n\n"
    finally:
        yield "data: [DONE]\n\n"


def _create_ai_message(parts: dict) -> AIMessage:
    sig = inspect.signature(AIMessage)
    valid_keys = set(sig.parameters)
    filtered = {k: v for k, v in parts.items() if k in valid_keys}
    return AIMessage(**filtered)


def _sse_response_example() -> dict[int | str, Any]:
    return {
        status.HTTP_200_OK: {
            "description": "Server Sent Event Response",
            "content": {
                "text/event-stream": {
                    "example": "data: {'type': 'token', 'content': 'Hello'}\n\ndata: {'type': 'token', 'content': ' World'}\n\ndata: [DONE]\n\n",
                    "schema": {"type": "string"},
                }
            },
        }
    }


@router.post(
    "/{agent_id}/stream",
    response_class=StreamingResponse,
    responses=_sse_response_example(),
    operation_id="stream_with_agent_id",
)
@router.post("/stream", response_class=StreamingResponse, responses=_sse_response_example())
async def stream(
    user_input: StreamInput,
    agent_id: str = DEFAULT_AGENT,
    current_user: CurrentUser = Depends(get_current_user),
) -> StreamingResponse:
    agent: CompiledStateGraph = get_agent(agent_id)
    kwargs, run_id = await _handle_input(user_input, agent, agent_id, current_user)
    return StreamingResponse(
        message_generator(
            user_input=user_input,
            agent_id=agent_id,
            current_user=current_user,
            prepared_kwargs=(kwargs, run_id),
        ),
        media_type="text/event-stream",
    )


@router.post("/{agent_id}/history", operation_id="history_with_agent_id")
@router.post("/history")
async def history(
    input: ChatHistoryInput,
    agent_id: str = DEFAULT_AGENT,
    current_user: CurrentUser = Depends(get_current_user),
) -> ChatHistory:
    owner_id = await user_storage.get_thread_owner(input.thread_id)
    if owner_id and owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=404, detail="Thread not found")

    agent: CompiledStateGraph = get_agent(agent_id)
    config = RunnableConfig(configurable={"thread_id": input.thread_id})
    try:
        messages: list[BaseMessage] = []
        checkpointer = getattr(agent, "checkpointer", None)
        if checkpointer:
            tup = await checkpointer.aget_tuple(config)
            if tup and "__previous__" in (tup.checkpoint.get("channel_values") or {}):
                messages = messages_from_checkpoint(tup.checkpoint)
        state_snapshot = await agent.aget_state(config=config)
        if not messages:
            messages = list(state_snapshot.values.get("messages", []))

        # Check for active interrupts (e.g. ask node prompted the user and paused)
        if hasattr(state_snapshot, "tasks"):
            for task in state_snapshot.tasks:
                for inter in getattr(task, "interrupts", []):
                    if inter.value:
                        messages.append(AIMessage(content=str(inter.value)))

        chat_messages: list[ChatMessage] = [langchain_to_chat_message(m) for m in messages]

        # Attach trip_options to the last AI message if available in state
        trip_options = state_snapshot.values.get("trip_options")
        if trip_options and chat_messages:
            for cm in reversed(chat_messages):
                if cm.type == "ai":
                    cm.custom_data = {**cm.custom_data, "trip_options": trip_options}
                    break
        return ChatHistory(messages=chat_messages)
    except Exception as e:
        logger.error(f"An exception occurred: {e}")
        raise HTTPException(status_code=500, detail="Unexpected error")


@router.get("/{agent_id}/threads", operation_id="threads_with_agent_id")
@router.get("/threads")
async def threads(
    input: UserThreadsInput = Depends(),
    agent_id: str = DEFAULT_AGENT,
    current_user: CurrentUser = Depends(get_current_user),
) -> UserThreads:
    limit = input.limit if input else 50
    stored_threads = await user_storage.list_user_threads(current_user.id, limit=limit)
    if stored_threads:
        summaries = [
            ThreadSummary(
                thread_id=t["thread_id"],
                agent_id=agent_id,
                updated_at=t.get("updated_at"),
                title=t.get("title"),
            )
            for t in stored_threads
        ]
        return UserThreads(threads=summaries)

    # Checkpointer fallback if user_storage has no threads
    agent: CompiledStateGraph = get_agent(agent_id)
    checkpointer = getattr(agent, "checkpointer", None)
    if not checkpointer:
        return UserThreads(threads=[])

    try:
        summaries = await list_user_threads(checkpointer, current_user.id, agent_id, limit)
    except Exception as e:
        logger.error(f"An exception occurred: {e}")
        raise HTTPException(status_code=500, detail="Unexpected error")

    return UserThreads(threads=summaries)


@app.get("/health")
async def health_check():
    health_status = {"status": "ok"}

    if settings.LANGFUSE_TRACING:
        try:
            langfuse = Langfuse()
            health_status["langfuse"] = "connected" if langfuse.auth_check() else "disconnected"
        except Exception as e:
            logger.error(f"Langfuse connection error: {e}")
            health_status["langfuse"] = "disconnected"

    return health_status


app.include_router(auth_router)
app.include_router(router)

"""AG-UI endpoints with thread ownership and user isolation."""

import logging
from collections.abc import AsyncGenerator
from typing import Any
from uuid import uuid4

from ag_ui.core import EventType, RunAgentInput
from ag_ui.encoder import EventEncoder
from ag_ui_langgraph import LangGraphAgent
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.runnables import RunnableConfig
from langfuse.langchain import CallbackHandler  # type: ignore[import-untyped]
from langgraph.graph.state import CompiledStateGraph

from agents import DEFAULT_AGENT, get_agent
from core import settings
from memory import user_storage
from service.dependencies import CurrentUser, get_current_user
from service.utils import ensure_model_available

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agui")

RESERVED_CONFIGURABLE_KEYS = {"thread_id", "checkpoint_id", "checkpoint_ns"}


def _base_config(input_data: RunAgentInput, agent_id: str, user_id: str) -> RunnableConfig:
    forwarded: dict[str, Any] = input_data.forwarded_props or {}
    configurable = forwarded.get("configurable") or {}
    if not isinstance(configurable, dict):
        raise HTTPException(status_code=422, detail="forwardedProps.configurable must be an object")
    if overlap := RESERVED_CONFIGURABLE_KEYS & configurable.keys():
        raise HTTPException(
            status_code=422,
            detail=f"forwardedProps.configurable contains reserved keys: {overlap}",
        )

    if (model := configurable.get("model")) is not None:
        ensure_model_available(model)

    callbacks: list[Any] = []
    if settings.LANGFUSE_TRACING:
        callbacks.append(CallbackHandler())

    configurable = dict(configurable)
    configurable["user_id"] = user_id

    return RunnableConfig(
        configurable=configurable,
        metadata={"user_id": user_id, "agent_id": agent_id},
        callbacks=callbacks,
    )


async def _event_stream(
    agent_id: str,
    graph: CompiledStateGraph,
    input_data: RunAgentInput,
    config: RunnableConfig,
    encoder: EventEncoder,
) -> AsyncGenerator[str, None]:
    agent = LangGraphAgent(name=agent_id, graph=graph, config=config)  # type: ignore[arg-type]
    async for event in agent.run(input_data):
        if event.type == EventType.RAW:
            continue
        yield encoder.encode(event)


@router.post("/run", operation_id="agui_run_default")
@router.post("/{agent_id}/run", operation_id="agui_run")
async def agui_run(
    input_data: RunAgentInput,
    request: Request,
    agent_id: str = DEFAULT_AGENT,
    current_user: CurrentUser = Depends(get_current_user),
) -> StreamingResponse:
    try:
        graph: CompiledStateGraph = get_agent(agent_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    thread_id = input_data.thread_id or str(uuid4())
    owner_id = await user_storage.get_thread_owner(thread_id)
    if owner_id and owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=404, detail="Thread not found")

    if not owner_id:
        await user_storage.claim_or_touch_thread(thread_id, current_user.id)
    else:
        await user_storage.claim_or_touch_thread(thread_id, owner_id)

    config = _base_config(input_data, agent_id, current_user.id)
    encoder = EventEncoder(accept=request.headers.get("accept", ""))
    return StreamingResponse(
        _event_stream(agent_id, graph, input_data, config, encoder),
        media_type=encoder.get_content_type(),
    )

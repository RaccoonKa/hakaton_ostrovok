import logging
from collections.abc import AsyncGenerator
from typing import Any
from uuid import uuid4

from ag_ui.core import EventType, RunAgentInput
from ag_ui.encoder import EventEncoder
from ag_ui_langgraph import LangGraphAgent
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from langchain_core.runnables import RunnableConfig
from langfuse.langchain import CallbackHandler  # type: ignore[import-untyped]
from langgraph.graph.state import CompiledStateGraph

from agents import DEFAULT_AGENT, get_agent
from core import settings
from service.utils import ensure_model_available

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agui")

RESERVED_CONFIGURABLE_KEYS = {"thread_id", "checkpoint_id", "checkpoint_ns"}


def _base_config(input_data: RunAgentInput, agent_id: str) -> RunnableConfig:
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
    user_id = configurable.setdefault("user_id", str(uuid4()))

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
    input_data: RunAgentInput, request: Request, agent_id: str = DEFAULT_AGENT
) -> StreamingResponse:
    try:
        graph: CompiledStateGraph = get_agent(agent_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    config = _base_config(input_data, agent_id)
    encoder = EventEncoder(accept=request.headers.get("accept", ""))
    return StreamingResponse(
        _event_stream(agent_id, graph, input_data, config, encoder),
        media_type=encoder.get_content_type(),
    )
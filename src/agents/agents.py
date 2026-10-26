from dataclasses import dataclass
from typing import Any
import logging

from langgraph.graph.state import CompiledStateGraph

from schema import AgentInfo
from .chatbot import chatbot

logger = logging.getLogger("agents")
DEFAULT_AGENT = "chatbot"


@dataclass
class Agent:
    description: str
    graph: CompiledStateGraph


agents: dict[str, Agent] = {
    "chatbot": Agent(
        description="A simple chatbot that responds directly.",
        graph=chatbot,
    ),
}

try:
    from agents.travel.graph import travel_agent_graph

    agents["travel_agent"] = Agent(
        description="AI-агент планирования путешествий (поиск туров, отелей, билетов в локальной БД).",
        graph=travel_agent_graph,
    )
except Exception as e:
    logger.warning(f"Could not load travel_agent graph: {e}")


async def load_agent(agent_name: str) -> None:
    pass


def get_agent(agent_name: str) -> CompiledStateGraph:
    """Возвращает скомпилированный граф агента с поддержкой алиасов (travel <-> travel_agent)."""
    if agent_name not in agents:
        if agent_name == "travel" and "travel_agent" in agents:
            return agents["travel_agent"].graph
        if agent_name == "travel_agent" and "travel" in agents:
            return agents["travel"].graph
    return agents[agent_name].graph


def get_all_agent_info() -> list[AgentInfo]:
    """Возвращает информацию обо всех доступных агентах, включая алиасы."""
    info_list = [
        AgentInfo(key=agent_id, description=agent.description)
        for agent_id, agent in agents.items()
    ]
    if "travel_agent" in agents and "travel" not in agents:
        info_list.append(
            AgentInfo(
                key="travel",
                description="Алиас travel_agent для совместимости с фронтенд-клиентами.",
            )
        )
    return info_list

from dataclasses import dataclass
from typing import Any

from langgraph.graph.state import CompiledStateGraph

from agents.travel.graph import travel_agent_graph
from .chatbot import chatbot
from schema import AgentInfo

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
    "travel_agent": Agent(
        description="AI-агент для планирования путешествий (агрегация билетов и отелей).",
        graph=travel_agent_graph,
    ),
}


async def load_agent(agent_name: str) -> None:
    pass


def get_agent(agent_name: str) -> CompiledStateGraph:
    return agents[agent_name].graph


def get_all_agent_info() -> list[AgentInfo]:
    return [
        AgentInfo(key=agent_id, description=agent.description)
        for agent_id, agent in agents.items()
    ]
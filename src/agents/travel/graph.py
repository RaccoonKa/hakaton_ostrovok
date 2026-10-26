from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from agents.travel.state import TravelState
from agents.travel.nodes.planner import call_planner
from agents.travel.nodes.response import generate_response
from agents.travel.tools import TRAVEL_TOOLS


def route_after_planner(state: TravelState | dict):
    if isinstance(state, dict):
        messages = state.get("messages", [])
    else:
        messages = getattr(state, "messages", [])

    if messages:
        last_msg = messages[-1]
        if getattr(last_msg, "tool_calls", None):
            return "tools"
    return END


workflow = StateGraph(TravelState)

workflow.add_node("planner", call_planner)
workflow.add_node("tools", ToolNode(TRAVEL_TOOLS))
workflow.add_node("response", generate_response)

workflow.add_edge(START, "planner")
workflow.add_conditional_edges(
    "planner",
    route_after_planner,
    {
        "tools": "tools",
        END: END,
    },
)
workflow.add_edge("tools", "response")
workflow.add_edge("response", END)

travel_agent_graph = workflow.compile()
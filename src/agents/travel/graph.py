"""
Граф travel-agent с поддержкой бронирования и режима консьержа.
"""

from langgraph.graph import END, START, StateGraph

from agents.travel.nodes.aggregate import call_aggregate
from agents.travel.nodes.ask import call_ask
from agents.travel.nodes.concierge import call_concierge
from agents.travel.nodes.decide import call_decide
from agents.travel.nodes.extract import call_extract
from agents.travel.nodes.response import generate_response
from agents.travel.nodes.suggest import call_suggest_dates, call_suggest_destinations
from agents.travel.state import TravelState


def _validation_field(validation, name: str, default=None):
    if validation is None:
        return default
    if isinstance(validation, dict):
        return validation.get(name, default)
    return getattr(validation, name, default)


def route_after_decide(state: TravelState | dict) -> str:
    """Маршрутизация на основании состояния запроса."""
    if isinstance(state, dict):
        validation = state.get("last_validation")
        selected_option = state.get("selected_option")
        messages = state.get("messages", [])
    else:
        validation = getattr(state, "last_validation", None)
        selected_option = getattr(state, "selected_option", None)
        messages = getattr(state, "messages", [])

    # Если тур выбран:
    if selected_option:
        # Проверяем, показывали ли уже бронь пользователю
        already_presented = any(
            "Отличный выбор! Вы забронировали" in getattr(m, "content", "")
            for m in messages
        )
        # Если ещё не показывали — показываем подтверждение + маршрут
        if not already_presented:
            return "response"
        # Если уже показали, а пользователь пишет дальше — передаём консьержу!
        return "concierge"

    if validation is None:
        return "ask"

    if _validation_field(validation, "ready_for_search", False):
        return "aggregate"

    stage = _validation_field(validation, "stage", "")
    if stage == "preferences":
        return "ask"

    decisions = _validation_field(validation, "decisions_required", []) or []
    if "destination_selection" in decisions:
        return "suggest_destinations"
    if "date_selection" in decisions:
        return "suggest_dates"
    return "ask"


workflow = StateGraph(TravelState)

workflow.add_node("extract", call_extract)
workflow.add_node("decide", call_decide)
workflow.add_node("suggest_destinations", call_suggest_destinations)
workflow.add_node("suggest_dates", call_suggest_dates)
workflow.add_node("ask", call_ask)
workflow.add_node("aggregate", call_aggregate)
workflow.add_node("response", generate_response)
workflow.add_node("concierge", call_concierge)

workflow.add_edge(START, "extract")
workflow.add_edge("extract", "decide")

workflow.add_conditional_edges(
    "decide",
    route_after_decide,
    {
        "aggregate": "aggregate",
        "suggest_destinations": "suggest_destinations",
        "suggest_dates": "suggest_dates",
        "ask": "ask",
        "response": "response",
        "concierge": "concierge",
    },
)

workflow.add_edge("suggest_destinations", "ask")
workflow.add_edge("suggest_dates", "ask")
workflow.add_edge("ask", "extract")
workflow.add_edge("aggregate", "response")
workflow.add_edge("response", END)
workflow.add_edge("concierge", END)


def build_travel_graph(checkpointer=None):
    compiled = workflow.compile(checkpointer=checkpointer)
    compiled.name = "travel_agent"
    return compiled


travel_agent_graph = build_travel_graph()
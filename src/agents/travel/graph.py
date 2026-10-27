"""
Граф travel-agent.

Ключевой принцип: следующий шаг определяет **состояние запроса**, а не
последнее сообщение и не LLM.

::

    START
      ↓
    extract  (извлечь + слить с UserRequest)
      ↓
    decide   (deterministic validate)
      ├── ready ─────────────→ aggregate → response → END
      ├── нужен выбор города → suggest_destinations → ask(interrupt) → extract
      ├── нужен выбор дат ───→ suggest_dates ───────→ ask(interrupt) → extract
      └── нужны вопросы ─────→ ask(interrupt) ──────→ extract
"""

from langgraph.graph import END, START, StateGraph

from agents.travel.nodes.aggregate import call_aggregate
from agents.travel.nodes.ask import call_ask
from agents.travel.nodes.decide import call_decide
from agents.travel.nodes.extract import call_extract
from agents.travel.nodes.response import generate_response
from agents.travel.nodes.suggest import call_suggest_dates, call_suggest_destinations
from agents.travel.state import TravelState


def route_after_decide(state: TravelState | dict) -> str:
    """Маршрутизация на основании deterministic-результата проверки."""
    if isinstance(state, dict):
        validation = state.get("last_validation")
    else:
        validation = getattr(state, "last_validation", None)

    if validation is None:
        return "ask"

    if validation.ready:
        return "aggregate"

    decisions = validation.decisions_required or []
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
    },
)

workflow.add_edge("suggest_destinations", "ask")
workflow.add_edge("suggest_dates", "ask")

# После ответа пользователя (resume) снова извлекаем и оцениваем весь запрос.
workflow.add_edge("ask", "extract")

workflow.add_edge("aggregate", "response")
workflow.add_edge("response", END)

def build_travel_graph(checkpointer=None):
    """Скомпилировать граф (для приложения — без checkpointer, для тестов — с ним)."""
    compiled = workflow.compile(checkpointer=checkpointer)
    compiled.name = "travel_agent"
    return compiled


travel_agent_graph = build_travel_graph()

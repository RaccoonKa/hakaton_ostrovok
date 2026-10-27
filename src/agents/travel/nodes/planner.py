"""
Планировщик travel-agent.

В новой архитектуре планировщик НЕ полагается на LLM и историю сообщений.
Он принимает решение на основании всего ``UserRequest`` плюс
подтверждений пользователя (выбор города/периода).

``call_planner`` — удобная композиция «извлечь → проверить готовность»,
которая возвращает детерминированное решение о следующем шаге. Граф
использует отдельные узлы ``extract`` и ``decide``; ``call_planner``
предоставлен как единая точка для тестов и внешних вызовов.
"""

from __future__ import annotations

from agents.travel.logic.decision import validate_travel_request
from agents.travel.nodes.extract import call_extract
from agents.travel.state import TravelState


def next_step_from_validation(validation) -> str:
    """Определить следующий шаг по результату проверки готовности."""
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


def call_planner(state: TravelState | dict) -> dict:
    """Извлечь данные из последнего сообщения и оценить весь ``UserRequest``."""
    extracted = call_extract(state)

    if isinstance(state, dict):
        destination_confirmed = state.get("destination_confirmed", False)
        confirmed_range = state.get("confirmed_date_range")
        travelers_provided = state.get("travelers_provided", False)
    else:
        destination_confirmed = getattr(state, "destination_confirmed", False)
        confirmed_range = getattr(state, "confirmed_date_range", None)
        travelers_provided = getattr(state, "travelers_provided", False)

    destination_confirmed = extracted.get("destination_confirmed", destination_confirmed)
    travelers_provided = extracted.get("travelers_provided", travelers_provided)
    if "confirmed_date_range" in extracted:
        confirmed_range = extracted["confirmed_date_range"]
    request = extracted.get("user_request")

    validation = validate_travel_request(
        request,
        destination_selected=destination_confirmed,
        confirmed_date_range=confirmed_range,
        travelers_provided=travelers_provided,
    )

    step = next_step_from_validation(validation)
    status_map = {
        "suggest_destinations": "awaiting_destination_selection",
        "suggest_dates": "awaiting_date_selection",
        "aggregate": "ready_for_search",
        "ask": "collecting",
    }

    return {
        **extracted,
        "last_validation": validation,
        "unresolved_questions": validation.questions,
        "pending_questions": validation.questions,
        "planning_status": status_map.get(step, "collecting"),
    }


__all__ = ["call_planner", "next_step_from_validation"]

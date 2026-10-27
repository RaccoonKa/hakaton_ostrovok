"""
Узел принятия решения.

На основании **всего** ``UserRequest`` (а не последнего сообщения) и
подтверждений пользователя вычисляет:

* актуальный набор нерешённых вопросов;
* необходимость предложить города / периоды дат;
* готовность к агрегации.

Решение принимает код, а не LLM.
"""

from __future__ import annotations

from agents.travel.logic.decision import validate_travel_request
from agents.travel.state import TravelState


def call_decide(state: TravelState | dict) -> dict:
    if isinstance(state, dict):
        request = state.get("user_request")
        destination_confirmed = state.get("destination_confirmed", False)
        confirmed_range = state.get("confirmed_date_range")
    else:
        request = getattr(state, "user_request", None)
        destination_confirmed = getattr(state, "destination_confirmed", False)
        confirmed_range = getattr(state, "confirmed_date_range", None)

    validation = validate_travel_request(
        request,
        destination_selected=destination_confirmed,
        confirmed_date_range=confirmed_range,
    )

    if validation.ready:
        status = "ready_for_search"
    elif "destination_selection" in validation.decisions_required:
        status = "awaiting_destination_selection"
    elif "date_selection" in validation.decisions_required:
        status = "awaiting_date_selection"
    else:
        status = "collecting"

    return {
        "last_validation": validation,
        "unresolved_questions": validation.questions,
        "pending_questions": validation.questions,
        "planning_status": status,
    }


__all__ = ["call_decide"]

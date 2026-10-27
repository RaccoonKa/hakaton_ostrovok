"""
Узел принятия решения.

На основании **всего** ``UserRequest`` (а не последнего сообщения) и
подтверждений пользователя вычисляет актуальный этап диалога, набор
нерешённых вопросов и готовность к сверке/поиску.

Решение принимает код, а не LLM.
"""

from __future__ import annotations

from agents.travel.logic.decision import validate_travel_request
from agents.travel.state import TravelState


def _get(state, key, default=None):
    if isinstance(state, dict):
        return state.get(key, default)
    return getattr(state, key, default)


_STAGE_TO_STATUS = {
    "preferences": "awaiting_preferences",
    "destination": "awaiting_destination_selection",
    "dates": "awaiting_date_selection",
    "confirmation": "awaiting_request_confirmation",
    "ready": "ready_for_search",
    "details": "collecting",
}


def call_decide(state: TravelState | dict) -> dict:
    request = _get(state, "user_request")
    destination_confirmed = bool(_get(state, "destination_confirmed", False))
    confirmed_range = _get(state, "confirmed_date_range")
    travelers_provided = _get(state, "travelers_provided", None)
    request_confirmed = bool(_get(state, "request_confirmed", False))

    validation = validate_travel_request(
        request,
        destination_selected=destination_confirmed,
        confirmed_date_range=confirmed_range,
        travelers_provided=travelers_provided,
        request_confirmed=request_confirmed,
    )

    status = _STAGE_TO_STATUS.get(validation.stage, "collecting")

    return {
        "last_validation": validation,
        "unresolved_questions": validation.questions,
        "pending_questions": validation.questions,
        "planning_status": status,
        "awaiting_request_confirmation": validation.stage == "confirmation",
        "request_confirmed": validation.ready_for_search,
    }


__all__ = ["call_decide"]

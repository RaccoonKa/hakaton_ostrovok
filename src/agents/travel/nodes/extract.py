"""
Узел извлечения и обновления параметров запроса.

На каждом ходе:

1. берёт последнее сообщение пользователя;
2. извлекает из него параметры (:func:`extract_user_request`);
3. при наличии предложенных вариантов — разрешает выбор пользователя;
4. сливает патч с текущим ``UserRequest`` (:func:`merge_user_request`).

Ничего не ищет и не принимает решений за пользователя.
"""

from __future__ import annotations

from langchain_core.messages import BaseMessage, HumanMessage

from agents.travel.logic.decision import merge_user_request, resolve_selection
from agents.travel.logic.extraction import extract_user_request
from agents.travel.state import TravelState


def _last_human_message(messages: list[BaseMessage]) -> str:
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            return str(msg.content)
    return ""


def call_extract(state: TravelState | dict) -> dict:
    if isinstance(state, dict):
        messages = state.get("messages", []) or []
        current_request = state.get("user_request")
        candidates = state.get("candidate_destinations", []) or []
        date_options = state.get("date_options", []) or []
        destination_confirmed = state.get("destination_confirmed", False)
        confirmed_range = state.get("confirmed_date_range")
        travelers_provided = state.get("travelers_provided", False)
    else:
        messages = getattr(state, "messages", []) or []
        current_request = getattr(state, "user_request", None)
        candidates = getattr(state, "candidate_destinations", []) or []
        date_options = getattr(state, "date_options", []) or []
        destination_confirmed = getattr(state, "destination_confirmed", False)
        confirmed_range = getattr(state, "confirmed_date_range", None)
        travelers_provided = getattr(state, "travelers_provided", False)

    message = _last_human_message(list(messages))
    patch = extract_user_request(message, current_request)

    # --- Разрешение выбора среди предложенных кандидатов ---
    candidate_destinations = list(candidates)
    date_options = list(date_options)
    if (candidates or date_options) and message:
        selection = resolve_selection(message, list(candidates), list(date_options))
        if selection.kind == "destination" and selection.city:
            patch.destination = selection.city
        elif selection.kind == "date" and selection.date_range:
            confirmed_range = selection.date_range
            date_options = []

    # Явно названный пользователем город считается выбранным.
    if patch.destination:
        destination_confirmed = True
        candidate_destinations = []

    request = merge_user_request(current_request, patch)

    # Город вылета по умолчанию, если пользователь его не указал.
    if not request.origin:
        from agents.travel.tools import mock_dataset as ds

        request.origin = ds.DEFAULT_ORIGIN

    if patch.travelers is not None or patch.traveler_range is not None:
        travelers_provided = True

    updates: dict = {
        "user_request": request,
        "candidate_destinations": candidate_destinations,
        "date_options": date_options,
        "destination_confirmed": destination_confirmed,
        "travelers_provided": travelers_provided,
    }
    if confirmed_range is not None:
        updates["confirmed_date_range"] = confirmed_range
    return updates


__all__ = ["call_extract"]

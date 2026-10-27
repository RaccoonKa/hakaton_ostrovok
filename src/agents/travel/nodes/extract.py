"""
Узел извлечения и обновления параметров запроса.
"""

from __future__ import annotations

from langchain_core.messages import BaseMessage, HumanMessage

from agents.travel.logic.decision import (
    is_confirmation_message,
    merge_user_request,
    request_fingerprint,
    resolve_package_choice,
    resolve_selections,
    validate_travel_request,
)
from agents.travel.logic.extraction import extract_user_request
from agents.travel.state import TravelState
from agents.travel.tools import mock_dataset as ds
from domain.request import UserRequest


def _get(state, key, default=None):
    if isinstance(state, dict):
        return state.get(key, default)
    return getattr(state, key, default)


def _last_human_message(messages: list[BaseMessage]) -> str:
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            return str(msg.content)
    return ""


def call_extract(state: TravelState | dict) -> dict:
    messages = _get(state, "messages", []) or []
    current_request = _get(state, "user_request")
    candidates = list(_get(state, "candidate_destinations", []) or [])
    date_options = list(_get(state, "date_options", []) or [])
    destination_confirmed = bool(_get(state, "destination_confirmed", False))
    confirmed_range = _get(state, "confirmed_date_range")
    request_confirmed = bool(_get(state, "request_confirmed", False))
    awaiting_confirmation = bool(_get(state, "awaiting_request_confirmation", False))

    trip_options = list(_get(state, "trip_options", []) or [])
    selected_option = _get(state, "selected_option")
    last_search_key = _get(state, "last_search_key")
    aggregate_calls = int(_get(state, "aggregate_calls", 0) or 0)
    search_diagnostics = dict(_get(state, "search_diagnostics", {}) or {})

    message = _last_human_message(list(messages))

    # --- Если тур уже выбран и мы в режиме консьержа ---
    if selected_option:
        # Проверяем, не хочет ли пользователь сменить тур
        reset_words = ["другой вариант", "другой тур", "поменяй тур", "выбрать другой", "начать заново", "сброс"]
        if any(w in message.lower() for w in reset_words):
            return {
                "selected_option": None,
                "planning_status": "results_ready",
            }
        # Иначе просто оставляем всё без изменений — консьерж ответит на вопрос
        return {
            "user_request": current_request,
            "selected_option": selected_option,
            "trip_options": trip_options,
        }

    # --- Выбор пакета из предложенных вариантов ---
    chosen_package = None
    if trip_options and not selected_option and message:
        chosen_package = resolve_package_choice(message, trip_options)
        if chosen_package:
            selected_option = chosen_package

    selected_date = None
    patch = None

    if chosen_package:
        request = current_request or UserRequest()
        changed = False
    else:
        patch = extract_user_request(message, current_request)

        if message and "не ограничен" in message.lower():
            patch.budget_mode = "no_limit"

        if message and (candidates or date_options):
            selected_city, selected_date = resolve_selections(message, candidates, date_options)
            if selected_city:
                patch.destination = selected_city
                dest = ds.get_destination_by_city(selected_city)
                if dest is not None:
                    patch.destination_country = dest.country
                candidates = []
            if selected_date is not None:
                patch.exact_dates = [selected_date.start_date, selected_date.end_date]
                confirmed_range = selected_date
                date_options = []

        if patch.destination:
            destination_confirmed = True
            candidates = []
        elif patch.destination_ambiguous:
            destination_confirmed = False

        request = merge_user_request(current_request, patch)

        if not request.origin:
            request.origin = ds.DEFAULT_ORIGIN

        if request.budget_mode == "unknown" and (
            request.budget is not None or request.budget_range is not None
        ):
            request.budget_mode = "specified"

        changed = request_fingerprint(current_request) != request_fingerprint(request)

    if changed:
        request_confirmed = False
        awaiting_confirmation = False
        trip_options = []
        selected_option = None
        last_search_key = None
        aggregate_calls = 0
        search_diagnostics = {}
        if selected_date is None and patch and (patch.exact_dates or patch.month or patch.season):
            confirmed_range = None

    if (
        not changed
        and awaiting_confirmation
        and message
        and is_confirmation_message(message)
    ):
        preliminary = validate_travel_request(
            request,
            destination_selected=destination_confirmed,
            confirmed_date_range=confirmed_range,
            travelers_provided=request.travelers_provided,
            request_confirmed=False,
        )
        if preliminary.ready_for_confirmation:
            request_confirmed = True
            awaiting_confirmation = False

    updates: dict = {
        "user_request": request,
        "candidate_destinations": candidates,
        "date_options": date_options,
        "destination_confirmed": destination_confirmed,
        "travelers_provided": request.travelers_provided,
        "request_confirmed": request_confirmed,
        "awaiting_request_confirmation": awaiting_confirmation,
        "trip_options": trip_options,
        "selected_option": selected_option,
        "last_search_key": last_search_key,
        "aggregate_calls": aggregate_calls,
        "search_diagnostics": search_diagnostics,
    }
    if confirmed_range is not None:
        updates["confirmed_date_range"] = confirmed_range
    elif changed:
        updates["confirmed_date_range"] = None
    return updates


__all__ = ["call_extract"]
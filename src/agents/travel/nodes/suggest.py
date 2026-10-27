"""
Узлы генерации вариантов (города / периоды дат).

Узлы только формируют варианты и сохраняют их в state. Они НЕ выбирают
город или дату за пользователя — выбор делает пользователь через interrupt.
"""

from __future__ import annotations

from agents.travel.logic.decision import suggest_date_ranges, suggest_destinations
from agents.travel.state import TravelState


def _get(state, key, default=None):
    if isinstance(state, dict):
        return state.get(key, default)
    return getattr(state, key, default)


def call_suggest_destinations(state: TravelState | dict) -> dict:
    request = _get(state, "user_request")
    candidates = suggest_destinations(request)

    updates: dict = {
        "candidate_destinations": candidates,
        "planning_status": "awaiting_destination_selection",
    }

    # Если месяц и длительность известны, но точных дат нет — сразу
    # показываем варианты периодов, чтобы пользователь мог ответить одним
    # сообщением и про город, и про даты.
    if (
        request is not None
        and request.date_preferences.month
        and request.duration
        and not request.date_preferences.exact_dates
    ):
        ranges = suggest_date_ranges(request)
        if ranges:
            updates["date_options"] = ranges
    return updates


def call_suggest_dates(state: TravelState | dict) -> dict:
    request = _get(state, "user_request")
    ranges = suggest_date_ranges(request) if request is not None else []
    return {
        "date_options": ranges,
        "planning_status": "awaiting_date_selection",
    }


__all__ = ["call_suggest_dates", "call_suggest_destinations"]

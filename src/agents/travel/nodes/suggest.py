"""
Узлы генерации вариантов (города / периоды дат).

Узлы только формируют варианты и сохраняют их в state. Они НЕ выбирают
город или дату за пользователя — выбор делает пользователь через interrupt.
"""

from __future__ import annotations

from agents.travel.logic.decision import suggest_date_ranges, suggest_destinations
from agents.travel.state import TravelState


def call_suggest_destinations(state: TravelState | dict) -> dict:
    if isinstance(state, dict):
        request = state.get("user_request")
    else:
        request = getattr(state, "user_request", None)

    candidates = suggest_destinations(request)
    return {
        "candidate_destinations": candidates,
        "planning_status": "awaiting_destination_selection",
    }


def call_suggest_dates(state: TravelState | dict) -> dict:
    if isinstance(state, dict):
        request = state.get("user_request")
    else:
        request = getattr(state, "user_request", None)

    ranges = suggest_date_ranges(request) if request is not None else []
    return {
        "date_options": ranges,
        "planning_status": "awaiting_date_selection",
    }


__all__ = ["call_suggest_dates", "call_suggest_destinations"]

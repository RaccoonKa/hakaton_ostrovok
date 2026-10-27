"""
Узел агрегации.

Вызывается **только** при ``validation.ready_for_search == True``
(то есть после подтверждения сверки). Дополнительно повторно проверяет
готовность через :func:`validate_travel_request` (deterministic guard).

Правила:

* один подтверждённый период — один поисковый проход;
* для ``no_limit`` / ``flexible_scenarios`` не создаются искусственные
  бюджетные сценарии: агрегатор сам возвращает «Эконом», «Оптимальный»,
  «Комфорт»;
* для заданного бюджета используется его лимит (верхняя граница диапазона)
  и валюта пользователя;
* результаты дедуплицируются, повторный вызов с тем же ключом кэшируется.
"""

from __future__ import annotations

from agents.travel.logic.decision import (
    build_search_key,
    dedupe_trip_options,
    validate_travel_request,
)
from agents.travel.state import TravelState
from agents.travel.tools.packaging import search_and_package_trip


def _get(state, key, default=None):
    if isinstance(state, dict):
        return state.get(key, default)
    return getattr(state, key, default)


def _resolve_dates(request, confirmed_range) -> list[tuple[str, str | None]]:
    """Вернуть список (departure_date, return_date) только для подтверждённого периода."""
    exact = list(request.date_preferences.exact_dates or [])
    if len(exact) >= 2:
        return [(exact[0].isoformat(), exact[1].isoformat())]
    if confirmed_range is not None:
        return [
            (
                confirmed_range.start_date.isoformat(),
                confirmed_range.end_date.isoformat(),
            )
        ]
    return []


def _budget_settings(request) -> tuple[str, float | None, str | None]:
    mode = request.budget_mode
    if mode == "unknown" and (request.budget is not None or request.budget_range is not None):
        mode = "specified"
    if mode == "unknown":
        mode = "no_limit"

    currency = request.currency.value if request.currency is not None else None
    if mode == "specified":
        if request.budget_range is not None:
            limit = float(request.budget_range[1])
        else:
            limit = float(request.budget) if request.budget is not None else None
    else:
        limit = None
    return mode, limit, currency


def call_aggregate(state: TravelState | dict) -> dict:
    request = _get(state, "user_request")
    confirmed_range = _get(state, "confirmed_date_range")
    destination_confirmed = bool(_get(state, "destination_confirmed", False))
    request_confirmed = bool(_get(state, "request_confirmed", False))
    travelers_provided = _get(state, "travelers_provided", None)

    # --- Deterministic guard ---
    validation = validate_travel_request(
        request,
        destination_selected=destination_confirmed,
        confirmed_date_range=confirmed_range,
        travelers_provided=travelers_provided,
        request_confirmed=request_confirmed,
    )
    if not validation.ready_for_search or request is None or not request.origin:
        return {
            "last_validation": validation,
            "unresolved_questions": validation.questions,
            "planning_status": "collecting",
        }

    dates = _resolve_dates(request, confirmed_range)
    if not dates:
        return {
            "last_validation": validation,
            "unresolved_questions": ["На какие даты планируете поездку?"],
            "planning_status": "collecting",
        }

    budget_mode, budget_limit, currency = _budget_settings(request)

    search_key = build_search_key(
        request,
        dates,
        budget_mode=budget_mode,
        budget_limit=budget_limit,
        currency=currency,
    )

    previous_key = _get(state, "last_search_key")
    previous_options = list(_get(state, "trip_options", []) or [])
    previous_calls = int(_get(state, "aggregate_calls", 0) or 0)

    # Один и тот же нормализованный запрос не должен повторно вызывать агрегатор.
    if previous_key == search_key and previous_options:
        return {
            "trip_options": previous_options,
            "planning_status": "results_ready",
            "last_validation": validation,
            "unresolved_questions": [],
            "last_search_key": search_key,
            "search_diagnostics": {
                "reason": "cached_same_request",
                "search_key": search_key,
                "budget_mode": budget_mode,
                "calls": 0,
                "results_before_dedup": len(previous_options),
                "results_after_dedup": len(previous_options),
            },
        }

    all_packages: list[dict] = []
    calls = 0
    for dep, ret in dates:
        packages = search_and_package_trip.invoke(
            {
                "origin": request.origin,
                "destination": request.destination,
                "departure_date": dep,
                "return_date": ret,
                "passengers": max(1, request.travelers),
                "budget_limit": budget_limit,
                "currency": currency,
                "preferred_transport": getattr(request.preferred_transport, "value", None),
                "require_baggage": any(c.name == "with_baggage" for c in request.constraints),
                "require_refundable": any(c.name == "refundable_ticket" for c in request.constraints),
                "free_cancellation": "free_cancellation" in request.hotel_requirements,
                "pet_friendly": "pet_friendly" in request.hotel_requirements,
            }
        )
        calls += 1
        for pkg in packages:
            entry = dict(pkg)
            entry["budget_mode"] = budget_mode
            all_packages.append(entry)

    before = len(all_packages)
    deduped = dedupe_trip_options(all_packages) if calls else []

    return {
        "trip_options": deduped,
        "planning_status": "results_ready",
        "last_validation": validation,
        "unresolved_questions": [],
        "last_search_key": search_key,
        "aggregate_calls": previous_calls + calls,
        "request_confirmed": True,
        "awaiting_request_confirmation": False,
        "search_diagnostics": {
            "reason": "request_confirmed",
            "search_key": search_key,
            "budget_mode": budget_mode,
            "calls": calls,
            "results_before_dedup": before,
            "results_after_dedup": len(deduped),
        },
    }


__all__ = ["call_aggregate"]

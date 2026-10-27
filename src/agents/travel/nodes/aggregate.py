"""
Узел агрегации.

Вызывается **только** при ``validation.ready == True``. Дополнительно
проверяет готовность через :func:`validate_travel_request` (deterministic
guard). Агрегатор вызывается с mock dataset.

Поддерживает:

* отсутствие бюджета → несколько бюджетных сценариев;
* несколько допустимых периодов → несколько поисков с объединением
  результатов (без затирания предыдущих).
"""

from __future__ import annotations

from agents.travel.logic.decision import DEFAULT_BUDGET_SCENARIOS, validate_travel_request
from agents.travel.state import TravelState
from agents.travel.tools.packaging import search_and_package_trip


def _resolve_dates(state_request, confirmed_range, date_options) -> list[tuple[str, str | None]]:
    """Вернуть список (departure_date, return_date)."""
    exact = state_request.date_preferences.exact_dates
    if exact and len(exact) >= 2:
        return [(exact[0].isoformat(), exact[1].isoformat())]
    if confirmed_range is not None:
        return [(confirmed_range.start_date.isoformat(), confirmed_range.end_date.isoformat())]
    if date_options:
        return [(r.start_date.isoformat(), r.end_date.isoformat()) for r in date_options]
    return []


def call_aggregate(state: TravelState | dict) -> dict:
    if isinstance(state, dict):
        request = state.get("user_request")
        confirmed_range = state.get("confirmed_date_range")
        date_options = list(state.get("date_options", []) or [])
        destination_confirmed = state.get("destination_confirmed", False)
    else:
        request = getattr(state, "user_request", None)
        confirmed_range = getattr(state, "confirmed_date_range", None)
        date_options = list(getattr(state, "date_options", []) or [])
        destination_confirmed = getattr(state, "destination_confirmed", False)

    # --- Deterministic guard ---
    validation = validate_travel_request(
        request,
        destination_selected=destination_confirmed,
        confirmed_date_range=confirmed_range,
    )
    if not validation.ready or request is None or not request.origin:
        # Агрегатор НЕ вызывается на неполном запросе.
        return {
            "last_validation": validation,
            "unresolved_questions": validation.questions,
            "planning_status": "collecting",
        }

    dates = _resolve_dates(request, confirmed_range, date_options)
    if not dates:
        return {
            "last_validation": validation,
            "unresolved_questions": ["На какие даты планируете поездку?"],
            "planning_status": "collecting",
        }

    budgets: list[float | None]
    if request.budget is not None:
        budgets = [request.budget]
    else:
        budgets = list(DEFAULT_BUDGET_SCENARIOS.values())

    all_packages: list[dict] = []
    for dep, ret in dates:
        for budget in budgets:
            packages = search_and_package_trip.invoke(
                {
                    "origin": request.origin,
                    "destination": request.destination,
                    "departure_date": dep,
                    "return_date": ret,
                    "passengers": max(1, request.travelers),
                    "budget_limit": budget,
                }
            )
            scenario = None
            if request.budget is None:
                scenario = _scenario_name(budget)
            for pkg in packages:
                if scenario:
                    pkg = dict(pkg)
                    pkg["budget_scenario"] = scenario
                all_packages.append(pkg)

    return {
        "trip_options": all_packages,
        "planning_status": "results_ready",
        "last_validation": validation,
        "unresolved_questions": [],
    }


def _scenario_name(budget: float) -> str:
    for name, value in DEFAULT_BUDGET_SCENARIOS.items():
        if abs(value - budget) < 1e-6:
            return name
    return "custom"


__all__ = ["call_aggregate"]

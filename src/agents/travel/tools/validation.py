"""
Инструмент deterministic-проверки готовности запроса.

``validate_travel_request_tool`` — тонкая LLM-обёртка над
:func:`agents.travel.logic.decision.validate_travel_request`. Принимает
примитивы (которые LLM может передать) и возвращает сериализованный
:class:`ValidationResult`.

Основной защитный барьер реализован в логике (код), а не в промпте.
"""

from __future__ import annotations

import json

from langchain_core.tools import tool

from agents.travel.logic.decision import validate_travel_request
from domain.common import Month
from domain.request import UserRequest


@tool
def validate_travel_request_tool(
    origin: str = "",
    destination: str = "",
    has_exact_dates: bool = False,
    month: str = "",
    duration: int = 0,
    travelers: int = 0,
    budget: float = 0,
    budget_mode: str = "",
    destination_confirmed: bool = False,
    confirmed_start_date: str = "",
    confirmed_end_date: str = "",
) -> str:
    """
    Проверяет, готов ли запрос к агрегации. Возвращает JSON с полями
    ready, missing, decisions_required, questions, budget_scenarios.

    Параметры:
    - budget_mode: 'no_limit' (если бюджет не ограничен / любой),
      'specified' (если указана точная сумма), 'flexible_scenarios' (подобрать разные варианты).
    - budget: числовая сумма бюджета (если указана).
    """
    req = UserRequest()
    if origin:
        req.origin = origin
    if destination:
        req.destination = destination
    if travelers:
        req.travelers = travelers
        req.travelers_provided = True
    if budget_mode:
        req.budget_mode = budget_mode
    elif budget and budget > 0:
        req.budget = budget
        req.budget_mode = "specified"
    if duration:
        req.duration = duration
    if month:
        try:
            req.date_preferences.month = [Month(month.strip().lower())]
        except ValueError:
            pass

    confirmed = None
    if confirmed_start_date and confirmed_end_date:
        from datetime import date

        from domain.planning import DateRange

        try:
            confirmed = DateRange(
                start_date=date.fromisoformat(confirmed_start_date),
                end_date=date.fromisoformat(confirmed_end_date),
            )
        except ValueError:
            confirmed = None

    result = validate_travel_request(
        req,
        destination_selected=destination_confirmed,
        confirmed_date_range=confirmed,
    )
    return json.dumps(result.model_dump(), ensure_ascii=False)


__all__ = ["validate_travel_request_tool"]

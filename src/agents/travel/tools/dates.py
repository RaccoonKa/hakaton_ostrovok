"""
Инструмент генерации периодов поездки.

``suggest_date_ranges_tool`` превращает month + duration в несколько
конкретных периодов. НЕ запускает поиск билетов.
"""

from __future__ import annotations

import json

from langchain_core.tools import tool

from agents.travel.logic.decision import suggest_date_ranges
from domain.common import Month
from domain.request import UserRequest


@tool
def suggest_date_ranges_tool(month: str, duration: int, year: int = 2026, count: int = 3) -> str:
    """
    Генерирует 2–3 конкретных периода поездки из месяца и длительности.

    :param month: английское название месяца (july).
    :param duration: длительность поездки в днях.
    """
    try:
        month_model = Month(month.strip().lower())
    except ValueError:
        return json.dumps({"ranges": [], "error": f"unknown month '{month}'"}, ensure_ascii=False)

    req = UserRequest(duration=duration)
    req.date_preferences.month = [month_model]
    ranges = suggest_date_ranges(req, count=count, year=year)
    return json.dumps(
        [
            {"start_date": r.start_date.isoformat(), "end_date": r.end_date.isoformat()}
            for r in ranges
        ],
        ensure_ascii=False,
    )


__all__ = ["suggest_date_ranges_tool"]

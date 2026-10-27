"""
Узел Human-in-the-loop.

Формирует **одно** сообщение со всеми необходимыми уточнениями и вызывает
LangGraph ``interrupt``. Interrupt используется не для каждого поля
отдельно, а для всего сгруппированного набора вопросов / вариантов выбора.

Отдельно обрабатываются два особых сообщения:

* первый этап — вопрос о предпочтениях (вайб);
* итоговая сверка полного запроса перед поиском.
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage
from langgraph.types import interrupt

from agents.travel.logic.decision import PREFERENCE_QUESTION
from agents.travel.state import TravelState
from agents.travel.tools import mock_dataset as ds
from domain.planning import DateRange, DestinationCandidate

_CITY_DISPLAY = {
    "Rome": "Рим",
    "Paris": "Париж",
    "Barcelona": "Барселона",
    "Prague": "Прага",
    "Antalya": "Анталья",
    "Lisbon": "Лиссабон",
    "Reykjavik": "Рейкьявик",
    "Amsterdam": "Амстердам",
    "Venice": "Венеция",
    "Milan": "Милан",
    "Florence": "Флоренция",
    "Dubai": "Дубай",
    "Bali": "Бали",
    "Paphos": "Пафос",
    "Crete": "Крит",
    "Moscow": "Москва",
    "Saint Petersburg": "Санкт-Петербург",
}

_VIBE_DISPLAY = {
    "beach": "море и пляжи",
    "sea": "море",
    "history": "история",
    "architecture": "архитектура",
    "nature": "природа",
    "culture": "культура",
    "food": "гастрономия",
    "nightlife": "ночная жизнь",
    "relax": "спокойный отдых",
    "romance": "романтика",
    "family": "семейный отдых",
    "adventure": "приключения",
    "shopping": "шопинг",
    "warm_weather": "тёплая погода",
    "wellness": "wellness",
    "city": "город",
    "canals": "каналы",
    "all_inclusive": "всё включено",
    "northern_lights": "северное сияние",
}

_CONSTRAINT_DISPLAY = {
    "with_child": "с ребёнком",
    "limited_mobility": "ограниченная мобильность",
    "accessible_hotel": "доступный отель",
    "no_night_flights": "без ночных перелётов",
    "no_stops": "без пересадок",
    "vegetarian": "вегетарианское питание",
}

_HOTEL_REQ_DISPLAY = {
    "center": "отель в центре",
    "pool": "бассейн",
    "breakfast": "завтрак",
    "sea_view": "вид на море",
    "spa": "спа",
    "all_inclusive": "всё включено",
    "quality": "хороший отель",
}

_NUM_WORD = {
    1: "один",
    2: "двоих",
    3: "троих",
    4: "четверых",
    5: "пятерых",
    6: "шестерых",
}


def _get(state, key, default=None):
    if isinstance(state, dict):
        return state.get(key, default)
    return getattr(state, key, default)


def _city_name(city: str | None) -> str:
    if not city:
        return "не выбран"
    return _CITY_DISPLAY.get(city, city)


def _format_destination_prompt(candidates: list[DestinationCandidate]) -> str:
    lines = ["Уточните, пожалуйста, город поездки — вот подходящие варианты:"]
    for i, cand in enumerate(candidates, start=1):
        reason = f" — {cand.reason}" if cand.reason else ""
        lines.append(f"{i}. {_city_name(cand.city)} ({cand.country}){reason}")
    lines.append("\nНапишите номер или название выбранного города.")
    return "\n".join(lines)


def _format_date_prompt(date_options: list[DateRange]) -> str:
    lines = ["Уточните, пожалуйста, период поездки — вот подходящие варианты:"]
    for i, rng in enumerate(date_options, start=1):
        lines.append(
            f"{i}. {rng.start_date.isoformat()} — {rng.end_date.isoformat()} ({rng.nights} ноч.)"
        )
    lines.append("\nНапишите номер или свои даты.")
    return "\n".join(lines)


def _format_questions_prompt(questions: list[str]) -> str:
    lines = ["Подскажите, пожалуйста:"]
    for i, q in enumerate(questions, start=1):
        lines.append(f"{i}. {q}")
    return "\n".join(lines)


def _format_money(amount: float, currency: str | None) -> str:
    return f"{amount:,.0f} {currency or 'RUB'}".replace(",", " ")


def format_request_summary(request) -> str:
    """Сформировать итоговую сверку полного запроса."""
    parts: list[str] = []

    origin = _city_name(getattr(request, "origin", None))
    default_note = ""
    if getattr(request, "origin", None) == ds.DEFAULT_ORIGIN:
        default_note = " (по умолчанию)"
    parts.append(f"вылет из города {origin}{default_note}")

    parts.append(f"направление — {_city_name(getattr(request, 'destination', None))}")

    exact = list(getattr(request.date_preferences, "exact_dates", None) or [])
    if len(exact) >= 2:
        nights = (exact[1] - exact[0]).days
        parts.append(
            f"даты — {exact[0].strftime('%d.%m.%Y')}–{exact[1].strftime('%d.%m.%Y')} "
            f"({nights} ноч.)"
        )
    elif getattr(request, "duration", None):
        month = getattr(request.date_preferences, "month", None) or []
        month_txt = month[0].value if month else "месяц"
        parts.append(f"даты — {month_txt}, {request.duration} дн.")
    else:
        parts.append("даты — не указаны")

    travelers = getattr(request, "travelers", 1)
    word = _NUM_WORD.get(travelers)
    traveler_txt = f"{travelers}" + (f" ({word})" if word else "")
    if getattr(request, "adults", None) or getattr(request, "children", None):
        details = []
        if getattr(request, "adults", None):
            details.append(f"взрослых — {request.adults}")
        if getattr(request, "children", None):
            details.append(f"детей — {request.children}")
        traveler_txt += "; " + ", ".join(details)
    parts.append(f"путешественников — {traveler_txt}")

    prefs = [_VIBE_DISPLAY.get(p.name, p.name) for p in getattr(request, "preferences", [])]
    if prefs:
        parts.append("предпочтения — " + ", ".join(prefs))
    else:
        parts.append("предпочтения — без особых предпочтений")

    mode = getattr(request, "budget_mode", "unknown")
    if mode == "no_limit":
        parts.append("бюджет — без бюджетного ограничения")
    elif mode == "flexible_scenarios":
        parts.append("бюджет — подберу варианты разных ценовых уровней")
    elif getattr(request, "budget_range", None):
        lo, hi = request.budget_range
        parts.append(
            "бюджет — от "
            + _format_money(lo, getattr(request.currency, "value", None))
            + " до "
            + _format_money(hi, getattr(request.currency, "value", None))
        )
    elif getattr(request, "budget", None) is not None:
        parts.append(
            "бюджет — "
            + _format_money(request.budget, getattr(request.currency, "value", None))
        )
    else:
        parts.append("бюджет — не указан")

    extras: list[str] = [
        _CONSTRAINT_DISPLAY.get(c.name, c.name) for c in getattr(request, "constraints", [])
    ]
    extras += [
        _HOTEL_REQ_DISPLAY.get(r, r) for r in getattr(request, "hotel_requirements", [])
    ]
    if extras:
        parts.append("дополнительно — " + ", ".join(dict.fromkeys(extras)))
    else:
        parts.append("дополнительных ограничений нет")

    return "Давайте сверимся перед поиском: " + "; ".join(parts) + ". Всё верно?"


def _filter_questions(
    questions: list[str],
    *,
    has_candidates: bool,
    has_dates: bool,
) -> list[str]:
    result = list(questions)
    if has_candidates:
        markers = ["предложенных городов", "В какой город или страну"]
        result = [q for q in result if not any(m in q for m in markers)]
    if has_dates:
        markers = ["предложенных периодов", "На какие даты"]
        result = [q for q in result if not any(m in q for m in markers)]
    return result


def call_ask(state: TravelState | dict) -> dict:
    candidates = list(_get(state, "candidate_destinations", []) or [])
    date_options = list(_get(state, "date_options", []) or [])
    questions = list(_get(state, "unresolved_questions", []) or [])
    request = _get(state, "user_request")
    validation = _get(state, "last_validation")
    stage = getattr(validation, "stage", None) or (
        validation.get("stage") if isinstance(validation, dict) else None
    ) or _get(state, "planning_status", "collecting")

    if stage == "confirmation" and request is not None:
        prompt = format_request_summary(request)
    elif stage in {"preferences", "awaiting_preferences"}:
        prompt = PREFERENCE_QUESTION
    else:
        sections: list[str] = []
        if candidates:
            sections.append(_format_destination_prompt(candidates))
        if date_options:
            sections.append(_format_date_prompt(date_options))
        extra = _filter_questions(
            questions,
            has_candidates=bool(candidates),
            has_dates=bool(date_options),
        )
        if extra:
            sections.append(_format_questions_prompt(extra))
        prompt = "\n\n".join(sections) if sections else (
            "Уточните, пожалуйста, детали поездки."
        )

    # Единственный interrupt на весь сгруппированный набор.
    response = interrupt(prompt)

    return {"messages": [HumanMessage(content=str(response))]}


__all__ = ["call_ask", "format_request_summary"]

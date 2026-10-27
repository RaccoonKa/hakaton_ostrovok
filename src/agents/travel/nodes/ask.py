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
    "Saint Petersburg": "Санкт-Петербург"
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
    "northern_lights": "северное сияние"
}

_CONSTRAINT_DISPLAY = {
    "with_child": "с ребёнком",
    "limited_mobility": "ограниченная мобильность",
    "accessible_hotel": "доступный отель",
    "no_night_flights": "без ночных перелётов",
    "no_stops": "без пересадок",
    "vegetarian": "вегетарианское питание",
    "with_baggage": "перелёт с багажом",
    "refundable_ticket": "возвратные билеты"
}

_HOTEL_REQ_DISPLAY = {
    "center": "отель в центре",
    "pool": "бассейн",
    "breakfast": "завтрак",
    "sea_view": "вид на море",
    "spa": "спа",
    "all_inclusive": "всё включено",
    "quality": "хороший отель",
    "pet_friendly": "можно с питомцами",
    "free_cancellation": "отель с бесплатной отменой"
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


_COUNTRY_FLAGS = {
    "Россия": "🇷🇺",
    "Турция": "🇹🇷",
    "Италия": "🇮🇹",
    "Франция": "🇫🇷",
    "ОАЭ": "🇦🇪",
}


def _format_destination_prompt(candidates: list[DestinationCandidate]) -> str:
    lines = ["**Подобрал отличные направления под ваш запрос:**\n"]
    for i, cand in enumerate(candidates, start=1):
        flag = _COUNTRY_FLAGS.get(cand.country, "✈️")
        reason = f" — {cand.reason}" if cand.reason else ""
        lines.append(f"{i}. {flag} **{_city_name(cand.city)} ({cand.country})**{reason}")

    lines.append("\n*Напишите номер или название выбранного города.*")
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
    if len(questions) == 1:
        return f"**Подскажите, пожалуйста:**\n\n- {questions[0]}"

    # Формируем стандартный Markdown-список с гарантированным переносом строк
    items = "\n".join(f"- {q}" for q in questions)
    return f"**Подскажите ещё пару деталей:**\n\n{items}"


def _format_money(amount: float, currency: str | None) -> str:
    return f"{amount:,.0f} {currency or 'RUB'}".replace(",", " ")


def format_request_summary(request) -> str:
    """Сформировать аккуратную и читаемую сверку полного запроса."""
    lines = ["Давайте сверимся перед поиском:\n"]

    # 1. Маршрут
    origin = _city_name(getattr(request, "origin", None)) or "Москва"
    dest = _city_name(getattr(request, "destination", None))
    lines.append(f"• **Маршрут:** {origin} → {dest}")

    # 2. Транспорт (если явно указан)
    transport = getattr(request, "preferred_transport", None)
    if transport:
        t_val = getattr(transport, "value", str(transport))
        t_map = {"plane": "самолёт", "train": "поезд", "bus": "автобус", "car": "автомобиль"}
        lines.append(f"• **Транспорт:** {t_map.get(t_val, t_val)}")

    # 3. Даты
    exact = list(getattr(request.date_preferences, "exact_dates", None) or [])
    if len(exact) >= 2:
        nights = (exact[1] - exact[0]).days
        lines.append(f"• **Даты:** {exact[0].strftime('%d.%m.%Y')} – {exact[1].strftime('%d.%m.%Y')} ({nights} ноч.)")
    elif getattr(request, "duration", None):
        month = getattr(request.date_preferences, "month", None) or []
        month_txt = month[0].value if month else "месяц"
        lines.append(f"• **Период:** {month_txt}, {request.duration} дн.")

    # 4. Состав гостей
    adults = getattr(request, "adults", None)
    children = getattr(request, "children", None)
    if adults or children:
        parts = []
        if adults:
            parts.append(f"{adults} взр.")
        if children:
            parts.append(f"{children} детей")
        lines.append(f"• **Гости:** {', '.join(parts)}")
    else:
        travelers = getattr(request, "travelers", 1)
        lines.append(f"• **Гости:** {travelers} чел.")

    # 5. Бюджет
    mode = getattr(request, "budget_mode", "unknown")
    if mode == "no_limit":
        lines.append("• **Бюджет:** без ограничений")
    elif mode == "flexible_scenarios":
        lines.append("• **Бюджет:** подберём варианты разных ценовых категорий")
    elif getattr(request, "budget_range", None):
        lo, hi = request.budget_range
        lines.append(f"• **Бюджет:** от {_format_money(lo, getattr(request.currency, 'value', None))} до {_format_money(hi, getattr(request.currency, 'value', None))}")
    elif getattr(request, "budget", None) is not None:
        lines.append(f"• **Бюджет:** {_format_money(request.budget, getattr(request.currency, 'value', None))}")

    # 6. Предпочтения
    prefs = [_VIBE_DISPLAY.get(p.name, p.name) for p in getattr(request, "preferences", [])]
    if prefs:
        lines.append(f"• **Вайб:** {', '.join(prefs)}")

    # 7. Пожелания и фильтры
    extras = [_CONSTRAINT_DISPLAY.get(c.name, c.name) for c in getattr(request, "constraints", [])]
    extras += [_HOTEL_REQ_DISPLAY.get(r, r) for r in getattr(request, "hotel_requirements", [])]
    if extras:
        lines.append(f"• **Пожелания:** {', '.join(dict.fromkeys(extras))}")

    # 8. Документы для зарубежных направлений (Турция)
    dest_raw = getattr(request, "destination", "") or ""
    dest_obj = ds.get_destination_by_city(dest_raw) if dest_raw else None
    country = dest_obj.country if dest_obj else getattr(request, "destination_country", None)
    if not country and dest in {"Стамбул", "Анталья"}:
        country = "Турция"

    if country == "Турция" or dest in {"Стамбул", "Анталья", "Istanbul", "Antalya"}:
        lines.append("• **Документы:** для въезда в Турцию потребуется загранпаспорт РФ (действителен от 120 дней, виза не нужна)")

    lines.append("\nНачинаем поиск или нужно ещё что-то уточнить?")
    return "\n".join(lines)


def _filter_questions(
        questions: list[str],
        *,
        has_candidates: bool,
        has_dates: bool,
) -> list[str]:
    result = list(questions)
    if has_candidates:
        # Убираем любые дублирующие вопросы про выбор города
        markers = [
            "предложенных городов",
            "В какой город или страну",
            "Этого города нет среди доступных",
        ]
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
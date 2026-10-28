"""
Узел Human-in-the-loop (ask).
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.types import interrupt

from agents.travel.logic.decision import PREFERENCE_QUESTION
from agents.travel.state import TravelState
from agents.travel.tools import mock_dataset as ds
from core.llm import get_model
from core.settings import settings
from domain.planning import DateRange, DestinationCandidate
from schema.models import GigaChatModelName

logger = logging.getLogger(__name__)

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
    "with_baggage": "перелёт с багажом",
    "refundable_ticket": "возвратные билеты",
}

_HOTEL_REQ_DISPLAY = {
    "center": "отель в центре",
    "pool": "бассейн",
    "breakfast": "завтрак",
    "sea_view": "вид на море",
    "spa": "спа",
    "all_inclusive": "всё включено",
    "quality": "хороший отель",
    "stars_3": "отель 3★",
    "stars_4": "отель 4★",
    "stars_5": "отель 5★",
    "pet_friendly": "можно с питомцами",
    "free_cancellation": "отель с бесплатной отменой",
}

_COUNTRY_FLAGS = {
    "Россия": "🇷🇺",
    "Турция": "🇹🇷",
    "Италия": "🇮🇹",
    "Франция": "🇫🇷",
    "ОАЭ": "🇦🇪",
}

_JOKE_BUDGET_MARKERS = [
    "сухарик", "доширак", "почк", "фантик", "борзыми щенками",
    "за спасибо", "красивые глаза", "картошк"
]


def _get(state, key, default=None):
    if isinstance(state, dict):
        return state.get(key, default)
    return getattr(state, key, default)


def _city_name(city: str | None) -> str:
    if not city:
        return "не выбран"
    return _CITY_DISPLAY.get(city, city)


def _last_human_message(state: TravelState | dict) -> str:
    messages = _get(state, "messages", []) or []
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            return str(msg.content)
    return ""


def _all_human_messages_text(state: TravelState | dict) -> str:
    messages = _get(state, "messages", []) or []
    texts = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            texts.append(str(msg.content))
    return " ".join(texts)


def _load_destinations_raw() -> list[dict]:
    p = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "destinations.json"
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def _get_destination_info(city: str, month: int | None) -> dict | None:
    target = city.strip().lower()
    for item in _load_destinations_raw():
        c_name = item.get("city", "").lower()
        if c_name == target or item.get("id", "").lower() == target or target in ds.CITY_ALIASES.get(c_name, []):
            weather = item.get("weather", {})
            monthly = weather.get("monthly", {})
            res = {
                "city": item.get("city"),
                "description": item.get("description", ""),
                "tagline": item.get("tagline", ""),
                "districts": item.get("popular_districts", []),
                "seasonality": item.get("seasonality", ""),
            }
            if month and str(month) in monthly:
                res["air"] = monthly[str(month)].get("air")
                res["water"] = monthly[str(month)].get("water")
            return res
    return None


def _is_side_question(text: str) -> bool:
    """Проверяет, задал ли пользователь вопрос, а не указал критерии тура."""
    if not text:
        return False
    lowered = text.strip().lower()
    confirm_words = [
        "да", "нет", "ок", "окей", "верно", "начинай", "поиск", "погнали",
        "1", "2", "3", "первый", "второй", "третий", "вернемся", "вернёмся"
    ]
    if any(lowered.startswith(w) for w in confirm_words):
        return False

    # Срабатываем ТОЛЬКО на знак вопроса или явные вопросительные конструкции
    question_triggers = [
        "подскажи", "как там", "какая погода", "тепло ли", "холодно ли",
        "можно ли", "стоит ли", "что с погодой", "какая температура",
        "нужна ли виза", "что посетить", "куда сходить", "что посмотреть",
        "где шоппинг", "где шопинг", "куда поехать на шоппинг"
    ]
    return "?" in lowered or any(k in lowered for k in question_triggers)


def _answer_side_question(question: str, request) -> str | None:
    dest_raw = getattr(request, "destination", None)
    # Если направление ещё не выбрано и в вопросе нет конкретного города — не отвечаем за Сочи
    if not dest_raw:
        found_city = None
        for d in ds.DESTINATIONS:
            if d.city.lower() in question.lower():
                found_city = d.city
                break
        if not found_city:
            return None
        dest = found_city
    else:
        dest_obj = ds.get_destination_by_city(dest_raw)
        dest = dest_obj.city if dest_obj else dest_raw

    # Специальный ответ про шоппинг
    if "шопинг" in question.lower() or "шоппинг" in question.lower():
        return (
            "Для отличного шопинга идеален **Стамбул** — там огромные торговые центры (Cevahir, Mall of Istanbul) "
            "и колоритные базары. Также популярен **Санкт-Петербург** с галереями и бутиками на Невском проспекте."
        )

    month = None
    if request and request.date_preferences.exact_dates:
        month = request.date_preferences.exact_dates[0].month
    elif request and request.date_preferences.month:
        month = getattr(request.date_preferences.month[0], "value", None)

    month_stems = {
        1: ["январ"], 2: ["феврал"], 3: ["март"], 4: ["апрел"],
        5: ["май", "мая"], 6: ["июн"], 7: ["июл"], 8: ["август"],
        9: ["сентябр"], 10: ["октябр"], 11: ["ноябр"], 12: ["декабр"],
    }
    for m_num, stems in month_stems.items():
        if any(s in question.lower() for s in stems):
            month = m_num
            break

    info = _get_destination_info(dest, month)
    facts = []
    if info:
        facts.append(f"Город: {info['city']}")
        if "air" in info:
            facts.append(f"месяц {month}: воздух +{info['air']}°C, вода в море +{info['water']}°C")
        if info.get("seasonality"):
            facts.append(f"Сезонность: {info['seasonality']}")
        if info.get("description"):
            facts.append(f"Особенности: {info['description']}")
    facts_str = "; ".join(facts) if facts else f"Город: {dest}"

    try:
        if hasattr(settings, "DEFAULT_MODEL") and settings.DEFAULT_MODEL in GigaChatModelName:
            model = get_model(settings.DEFAULT_MODEL)
        else:
            model = get_model(next(iter(GigaChatModelName)))

        prompt = (
            f"Ты — дружелюбный тревел-консультант. Турист спросил: \"{question}\"\n"
            f"Факты: {facts_str}\n\n"
            f"Дай краткий ответ в 1-2 предложениях на русском строго по фактам. Без выдумывания цен и без приветствий."
        )
        resp = model.invoke([
            SystemMessage(content="Отвечай строго по фактам базы данных."),
            HumanMessage(content=prompt),
        ])
        return str(resp.content).strip()
    except Exception as e:
        logger.warning("Ошибка при генерации ответа: %s", e)
        return None


def format_request_summary(request) -> str:
    items: list[str] = []

    origin = _city_name(getattr(request, "origin", None)) or "Москва"
    dest = _city_name(getattr(request, "destination", None))
    items.append(f"- **Маршрут:** {origin} → {dest}")

    transport = getattr(request, "preferred_transport", None)
    if transport:
        t_val = getattr(transport, "value", str(transport))
        t_map = {"plane": "самолёт", "train": "поезд", "bus": "автобус", "car": "автомобиль"}
        items.append(f"- **Транспорт:** {t_map.get(t_val, t_val)}")

    exact = list(getattr(request.date_preferences, "exact_dates", None) or [])
    if len(exact) >= 2:
        nights = (exact[1] - exact[0]).days
        items.append(f"- **Даты:** {exact[0].strftime('%d.%m.%Y')} – {exact[1].strftime('%d.%m.%Y')} ({nights} ноч.)")
    elif getattr(request, "duration", None):
        month = getattr(request.date_preferences, "month", None) or []
        month_txt = month[0].value if month else "месяц"
        items.append(f"- **Период:** {month_txt}, {request.duration} дн.")

    adults = getattr(request, "adults", None)
    children = getattr(request, "children", None)
    if adults or children:
        parts = []
        if adults:
            parts.append(f"{adults} взр.")
        if children:
            if children == 1:
                parts.append("1 ребёнок")
            elif 2 <= children <= 4:
                parts.append(f"{children} ребёнка")
            else:
                parts.append(f"{children} детей")
        items.append(f"- **Гости:** {', '.join(parts)}")
    else:
        travelers = getattr(request, "travelers", 1)
        items.append(f"- **Гости:** {travelers} чел.")

    mode = getattr(request, "budget_mode", "unknown")
    if mode == "no_limit":
        items.append("- **Бюджет:** без ограничений")
    elif mode == "flexible_scenarios":
        items.append("- **Бюджет:** подберём варианты разных ценовых категорий")
    elif getattr(request, "budget_range", None):
        lo, hi = request.budget_range
        items.append(f"- **Бюджет:** от {lo:,.0f} до {hi:,.0f} {getattr(request.currency, 'value', 'RUB')}".replace(",", " "))
    elif getattr(request, "budget", None) is not None:
        items.append(f"- **Бюджет:** {request.budget:,.0f} {getattr(request.currency, 'value', 'RUB')}".replace(",", " "))

    prefs = [_VIBE_DISPLAY.get(p.name, p.name) for p in getattr(request, "preferences", [])]
    if prefs:
        items.append(f"- **Вайб:** {', '.join(prefs)}")

    extras = [_CONSTRAINT_DISPLAY.get(c.name, c.name) for c in getattr(request, "constraints", [])]
    extras += [_HOTEL_REQ_DISPLAY.get(r, r) for r in getattr(request, "hotel_requirements", [])]
    if extras:
        items.append(f"- **Пожелания:** {', '.join(dict.fromkeys(extras))}")

    dest_raw = getattr(request, "destination", "") or ""
    dest_obj = ds.get_destination_by_city(dest_raw) if dest_raw else None
    country = dest_obj.country if dest_obj else getattr(request, "destination_country", None)
    transport_val = getattr(getattr(request, "preferred_transport", None), "value", None)

    if country == "Турция" or dest in {"Стамбул", "Анталья", "Istanbul", "Antalya"}:
        items.append("- **Документы:** для въезда в Турцию потребуется загранпаспорт РФ (действителен от 120 дней, без визы)")
    elif dest in {"Калининград", "Kaliningrad"}:
        if transport_val == "train":
            items.append("- **Документы:** для поезда в Калининград обязателен загранпаспорт РФ и УПД-ЖД (транзит через Литву)")
        elif transport_val == "plane":
            items.append("- **Документы:** для авиаперелёта в Калининград достаточно внутреннего паспорта РФ")
        else:
            items.append("- **Документы:** для самолёта достаточно паспорта РФ; для поезда потребуется загранпаспорт РФ и УПД-ЖД (транзит через Литву)")

    body = "\n".join(items)
    return (
        "**Давайте сверимся перед поиском:**\n\n"
        f"{body}\n\n"
        "Начинаем поиск или нужно ещё что-то уточнить?"
    )


def _format_destination_prompt(candidates: list[DestinationCandidate], custom_header: str | None = None) -> str:
    lines = [custom_header or "**Подобрал отличные направления под ваш запрос:**\n"]
    for i, cand in enumerate(candidates, start=1):
        flag = _COUNTRY_FLAGS.get(cand.country, "✈️")
        reason = f" — {cand.reason}" if cand.reason else ""
        lines.append(f"{i}. {flag} **{_city_name(cand.city)} ({cand.country})**{reason}")
    lines.append("\n*Напишите номер или название выбранного города.*")
    return "\n".join(lines)


def _format_date_prompt(date_options: list[DateRange]) -> str:
    lines = ["Уточните, пожалуйста, подходящий период поездки:\n"]
    for i, rng in enumerate(date_options, start=1):
        lines.append(
            f"{i}. {rng.start_date.strftime('%d.%m.%Y')} – {rng.end_date.strftime('%d.%m.%Y')} ({rng.nights} ноч.)"
        )
    lines.append("\nНапишите номер подходящего варианта (1, 2, 3) или свои даты.")
    return "\n".join(lines)


def _format_questions_prompt(questions: list[str], history_text: str = "") -> str:
    if not questions:
        return "Уточните, пожалуйста, детали поездки."

    lowered_hist = history_text.lower()
    has_joke_budget = any(m in lowered_hist for m in _JOKE_BUDGET_MARKERS)

    formatted_q = []
    for q in questions:
        if "бюджет" in q.lower() and has_joke_budget:
            formatted_q.append(
                "Сухарики — отличный перекус в дорогу, но билеты и отели принимают только рубли 🙂 "
                "Какой у вас реальный ориентировочный бюджет на поездку (или подберём варианты без ограничений)?"
            )
        else:
            formatted_q.append(q)

    if len(formatted_q) == 1:
        return f"**Подскажите, пожалуйста:**\n\n- {formatted_q[0]}"

    items = "\n".join(f"- {q}" for q in formatted_q)
    return f"**Подскажите ещё пару деталей:**\n\n{items}"


def _filter_questions(questions: list[str], *, has_candidates: bool, has_dates: bool) -> list[str]:
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

    side_answer = _get(state, "side_answer")
    if not side_answer:
        last_user_text = _last_human_message(state)
        if _is_side_question(last_user_text):
            side_answer = _answer_side_question(last_user_text, request)

    # 1. Если пользователь на этапе сверки задал вопрос — отвечаем и даем мостик
    if side_answer and stage == "confirmation":
        dest = _city_name(getattr(request, "destination", None)) if request else ""
        city_phrase = f" о {dest}" if dest and dest != "не выбран" else ""
        prompt = (
            f"☀️ **Ответ на ваш вопрос:**\n"
            f"{side_answer}\n\n"
            f"Подсказать ещё что-то{city_phrase} (погода, достопримечательности, правила) "
            f"или перейдём к подтверждению и поиску тура?"
        )
        response = interrupt(prompt)
        return {"messages": [HumanMessage(content=str(response))]}

    # 2. Формируем основной диалоговый шаг (без смешивания дат и бюджета)
    if stage == "confirmation" and request is not None:
        main_prompt = format_request_summary(request)
    elif stage in {"preferences", "awaiting_preferences"}:
        main_prompt = PREFERENCE_QUESTION
    elif candidates:
        custom_header = None
        missing_list = getattr(validation, "missing", []) if validation else []
        if "destination_unknown" in missing_list:
            dest_name = getattr(request, "destination", "Этот город")
            custom_header = (
                f"К сожалению, сейчас мы не организуем туры в **{dest_name}** "
                f"(работаем по направлениям: Сочи, Калининград, Санкт-Петербург, Стамбул, Анталья).\n\n"
                f"**Но я подобрал отличные альтернативы под ваши пожелания:**\n"
            )
        main_prompt = _format_destination_prompt(candidates, custom_header)
    elif date_options:
        main_prompt = _format_date_prompt(date_options)
    else:
        extra = _filter_questions(questions, has_candidates=False, has_dates=False)
        history_text = _all_human_messages_text(state)
        main_prompt = _format_questions_prompt(extra, history_text)

    # Если был врезной вопрос (например, про шоппинг), ответ ставится сверху
    if side_answer:
        prompt = f"☀️ **Ответ на ваш вопрос:**\n{side_answer}\n\n───────────────────────────────\n\n{main_prompt}"
    else:
        prompt = main_prompt

    response = interrupt(prompt)
    return {"messages": [HumanMessage(content=str(response))]}


__all__ = ["call_ask", "format_request_summary"]
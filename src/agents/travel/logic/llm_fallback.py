"""
Модуль NLU-фоллбэка на базе GigaChat с поддержкой погодных фактов.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import date

from langchain_core.messages import HumanMessage, SystemMessage

from agents.travel.tools import mock_dataset as ds
from core.llm import get_model
from core.settings import settings
from domain.common import Currency, Month, Season, TransportType
from domain.constraint import Constraint
from domain.planning import UserRequestPatch
from domain.preference import Preference, Priority
from domain.request import UserRequest
from schema.models import GigaChatModelName

logger = logging.getLogger(__name__)


def _get_chat_model():
    if hasattr(settings, "DEFAULT_MODEL") and settings.DEFAULT_MODEL in GigaChatModelName:
        try:
            return get_model(settings.DEFAULT_MODEL)
        except Exception as e:
            logger.warning("Не удалось загрузить DEFAULT_MODEL: %s", e)

    for model_name in GigaChatModelName:
        try:
            return get_model(model_name)
        except Exception:
            continue

    raise RuntimeError("Не удалось инициализировать GigaChat для NLU-фоллбэка.")


_SYSTEM_PROMPT = """Ты — интеллектуальный модуль извлечения параметров путешествия (NLU) для тревел-агента.
Твоя задача — извлечь из сообщения пользователя параметры поездки и вернуть СТРОГО валидный JSON.

Доступные сущности тестового мира:
- origin (город вылета): Москва, Санкт-Петербург, Казань, Екатеринбург, Новосибирск, Нижний Новгород.
- destination (город назначения): Сочи, Калининград, Санкт-Петербург, Стамбул, Анталья.
- destination_country: Россия, Турция.
- preferred_transport: "plane" (самолёт) или "train" (поезд, в т.ч. при аэрофобии/страхе летать).
- vibes (предпочтения): beach, sea, history, architecture, nature, culture, food, nightlife, relax, romance, family, adventure, shopping, all_inclusive.
- constraints (ограничения): no_stops (прямой рейс), with_baggage (багаж), refundable_ticket (возвратные билеты), with_child, no_night_flights, vegetarian.
- hotel_requirements: center (в центре), pool (бассейн), breakfast (завтрак), sea_view (вид на море / у моря), spa, all_inclusive, pet_friendly (с животными/котом/собакой), free_cancellation (бесплатная отмена).
- budget_mode: "no_limit" (если говорят 'любой', 'не ограничен', 'без разницы'), "flexible_scenarios" (если 'покажи разные цены', 'не знаю по стоимости'), "specified" (если указана сумма/диапазон).

- Если пользователь шутит о бюджете («пачка сухариков», «почка», «доширак», «миллиард фантиков», «за спасибо»), НЕ извлекай сумму (budget: null, budget_mode: "unknown").
В поле "side_answer" с добрым юмором подыграй шутке и вежливо уточни настоящий ориентировочный бюджет в рублях.

Поля выходного JSON:
{
  "origin": string | null,
  "destination": string | null,
  "destination_country": string | null,
  "duration": integer | null,
  "travelers": integer | null,
  "adults": integer | null,
  "children": integer | null,
  "budget": float | null,
  "budget_range": [float, float] | null,
  "budget_mode": "specified" | "no_limit" | "flexible_scenarios" | null,
  "currency": "RUB" | "USD" | "EUR" | null,
  "exact_dates": [string, string] | null,
  "month": [string] | null,
  "season": [string] | null,
  "preferences": [string] | null,
  "constraints": [string] | null,
  "hotel_requirements": [string] | null,
  "preferred_transport": "plane" | "train" | null,
  "side_answer": string | null  // Если был врезной вопрос о погоде/сезоне/правилах, дай краткий ответ в 1-2 предложениях на русском, строго опираясь на факты погоды из промпта. Иначе null.
}

Отвечай ТОЛЬКО чистым JSON, без пояснений и без markdown-блоков ```json."""


def should_call_llm_fallback(
    message: str,
    patch: UserRequestPatch,
    current_request: UserRequest | None,
    stage: str | None = None,
) -> bool:
    text = (message or "").strip().lower()
    words = text.split()
    if len(words) < 2:
        return False

    if text in {"да", "нет", "ок", "окей", "верно", "все верно", "всё верно", "начинаем", "поиск", "погнали", "1", "2", "3"}:
        return False
    if re.fullmatch(r"^(?:вариант|номер|город)?\s*\d+$", text):
        return False

    has_question = "?" in text or any(k in text for k in [
        "подскажи", "как там", "погода", "тепло ли", "холодно ли", "нужна ли виза", "карты мир", "купат", "градус"
    ])
    if has_question:
        return True

    if patch.is_empty() and len(words) >= 3:
        return True

    if stage in {"preferences", "awaiting_preferences"}:
        if not patch.preferences and not patch.destination:
            return True

    if current_request is not None:
        missing_dest = not current_request.destination and not patch.destination
        missing_budget = current_request.budget_mode == "unknown" and not patch.budget and not patch.budget_mode
        if (missing_dest or missing_budget or patch.destination_ambiguous) and len(words) >= 4:
            return True

    return False


def _find_city_and_month_for_weather(message: str, current_request: UserRequest | None) -> tuple[str | None, int | None]:
    lowered = message.lower()
    city = current_request.destination if current_request and current_request.destination else None

    if not city:
        for d in ds.DESTINATIONS:
            if d.city.lower() in lowered:
                city = d.city
                break
        if not city:
            for c_key, stems in ds.CITY_ALIASES.items():
                if any(stem in lowered for stem in stems):
                    if d := ds.get_destination_by_city(c_key):
                        city = d.city
                        break

    month_stems = {
        1: ["январ"], 2: ["феврал"], 3: ["март"], 4: ["апрел"],
        5: ["май", "мая"], 6: ["июн"], 7: ["июл"], 8: ["август"],
        9: ["сентябр"], 10: ["октябр"], 11: ["ноябр"], 12: ["декабр"],
    }
    month = None
    for m_num, stems in month_stems.items():
        if any(stem in lowered for stem in stems):
            month = m_num
            break

    if month is None and current_request:
        if current_request.date_preferences.exact_dates:
            month = current_request.date_preferences.exact_dates[0].month
        elif current_request.date_preferences.month:
            m_enum = current_request.date_preferences.month[0]
            month = getattr(m_enum, "value", None)
            # Если enum возвращает имя месяца
            for m_num, stems in month_stems.items():
                if any(stem in str(m_enum).lower() for stem in stems):
                    month = m_num
                    break

    return city, month


def _safe_parse_json(content: str) -> dict:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(0)
    return json.loads(cleaned)


def extract_with_llm(
    message: str,
    current_request: UserRequest | None,
    reference_date: date | None = None,
) -> tuple[UserRequestPatch, str | None]:
    reference_date = reference_date or date.today()

    known_context = []
    if current_request:
        if current_request.origin:
            known_context.append(f"Город вылета: {current_request.origin}")
        if current_request.destination:
            known_context.append(f"Направление: {current_request.destination}")
        if current_request.travelers:
            known_context.append(f"Путешественников: {current_request.travelers}")
        if current_request.budget_mode != "unknown":
            known_context.append(f"Режим бюджета: {current_request.budget_mode}")

    context_str = "; ".join(known_context) if known_context else "Запрос только начат"

    # Добавляем климатическую справку из destinations.json, если актуально
    weather_info_str = ""
    city, month = _find_city_and_month_for_weather(message, current_request)
    if city:
        w_info = ds.get_weather_info(city, month)
        if w_info:
            parts = [f"Город: {w_info['city']}"]
            if "air_temp" in w_info:
                parts.append(f"месяц {month}: воздух {w_info['air_temp']}°C, вода {w_info['water_temp']}°C")
            if "season_desc" in w_info:
                parts.append(w_info["season_desc"])
            if "seasonality" in w_info:
                parts.append(f"Сезонность: {w_info['seasonality']}")
            weather_info_str = f"\nФакты о погоде из базы данных:\n{'; '.join(parts)}\n"

    user_prompt = (
        f"Текущая опорная дата: {reference_date.isoformat()}.\n"
        f"Уже известно из контекста: {context_str}.\n"
        f"{weather_info_str}\n"
        f"Новое сообщение пользователя: \"{message}\"\n\n"
        f"Извлеки параметры и верни JSON. Если пользователь задал вопрос о погоде/сезоне, опирайся на факты выше."
    )

    try:
        model = _get_chat_model()
        response = model.invoke([
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=user_prompt),
        ])
        data = _safe_parse_json(str(response.content))
    except Exception as e:
        logger.warning("Ошибка вызова GigaChat в extract_with_llm: %s", e)
        return UserRequestPatch(), None

    side_answer = data.get("side_answer")
    patch = UserRequestPatch()

    if data.get("origin"):
        patch.origin = str(data["origin"])
    if data.get("destination"):
        patch.destination = str(data["destination"])
    if data.get("destination_country"):
        patch.destination_country = str(data["destination_country"])
    if data.get("duration"):
        patch.duration = int(data["duration"])
    if data.get("travelers"):
        patch.travelers = int(data["travelers"])
    if data.get("adults"):
        patch.adults = int(data["adults"])
    if data.get("children"):
        patch.children = int(data["children"])
    if data.get("budget"):
        patch.budget = float(data["budget"])
    if data.get("budget_range") and len(data["budget_range"]) == 2:
        patch.budget_range = (float(data["budget_range"][0]), float(data["budget_range"][1]))
    if data.get("budget_mode") in {"specified", "no_limit", "flexible_scenarios"}:
        patch.budget_mode = data["budget_mode"]

    if data.get("currency"):
        cur_map = {"RUB": Currency.RUB, "USD": Currency.USD, "EUR": Currency.EUR}
        patch.currency = cur_map.get(data["currency"].upper())

    if data.get("preferred_transport"):
        t_map = {"plane": TransportType.PLANE, "train": TransportType.TRAIN}
        patch.preferred_transport = t_map.get(data["preferred_transport"].lower())

    if data.get("exact_dates") and len(data["exact_dates"]) == 2:
        try:
            patch.exact_dates = [
                date.fromisoformat(data["exact_dates"][0]),
                date.fromisoformat(data["exact_dates"][1]),
            ]
        except Exception:
            pass

    if data.get("month"):
        m_list = []
        for m_str in data["month"]:
            for m_enum in Month:
                if m_enum.value.lower() == m_str.lower() or m_str.lower() in m_enum.name.lower():
                    m_list.append(m_enum)
        if m_list:
            patch.month = m_list

    if data.get("preferences"):
        patch.preferences = [
            Preference(name=vibe, priority=Priority.MEDIUM)
            for vibe in data["preferences"]
        ]
        patch.preference_status = "specified"

    if data.get("constraints"):
        patch.constraints = [
            Constraint(name=c, value=True, hard=False)
            for c in data["constraints"]
        ]

    if data.get("hotel_requirements"):
        patch.hotel_requirements = [str(r) for r in data["hotel_requirements"]]

    return patch, side_answer


def merge_llm_into_deterministic(base_patch: UserRequestPatch, llm_patch: UserRequestPatch) -> UserRequestPatch:
    result = base_patch.model_copy(deep=True)

    scalar_keys = [
        "origin", "destination", "destination_country", "duration",
        "travelers", "traveler_range", "adults", "children",
        "budget", "budget_range", "budget_mode", "currency",
        "preferred_transport", "preference_status"
    ]
    for key in scalar_keys:
        if getattr(result, key) is None and getattr(llm_patch, key) is not None:
            setattr(result, key, getattr(llm_patch, key))

    if not result.exact_dates and llm_patch.exact_dates:
        result.exact_dates = llm_patch.exact_dates
    if not result.month and llm_patch.month:
        result.month = llm_patch.month
    if not result.season and llm_patch.season:
        result.season = llm_patch.season

    if not result.preferences and llm_patch.preferences:
        result.preferences = llm_patch.preferences
    if not result.constraints and llm_patch.constraints:
        result.constraints = llm_patch.constraints
    if not result.hotel_requirements and llm_patch.hotel_requirements:
        result.hotel_requirements = llm_patch.hotel_requirements

    if result.destination and result.destination_ambiguous:
        result.destination_ambiguous = False

    return result


__all__ = [
    "extract_with_llm",
    "merge_llm_into_deterministic",
    "should_call_llm_fallback",
]
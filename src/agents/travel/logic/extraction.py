"""
Deterministic extraction параметров из сообщения пользователя.

Модуль преобразует естественный язык в :class:`UserRequestPatch`.
Он не вызывает LLM, не ищет билеты и отели и не принимает решений за
пользователя — только извлекает то, что явно присутствует в тексте.

Ключевые модели :class:`UserRequest` описаны в ``domain.request``.
``None`` в патче означает «значение не найдено в текущем сообщении», а не
«стереть старое значение».
"""

from __future__ import annotations

import re
from datetime import date

from agents.travel.tools import mock_dataset as ds
from domain.common import Currency, Month, Season, TransportType
from domain.constraint import Constraint
from domain.planning import UserRequestPatch
from domain.preference import Preference, Priority

# --- Словари месяцев и сезонов --------------------------------------------
_MONTH_TOKENS: dict[Month, list[str]] = {
    Month.JANUARY: ["январ", "january", "jan"],
    Month.FEBRUARY: ["феврал", "february", "feb"],
    Month.MARCH: ["март", "march", "mar"],
    Month.APRIL: ["апрел", "april", "apr"],
    Month.MAY: ["май", "мая", "may"],
    Month.JUNE: ["июн", "june", "jun"],
    Month.JULY: ["июл", "july", "jul"],
    Month.AUGUST: ["август", "august", "aug"],
    Month.SEPTEMBER: ["сентябр", "september", "sep"],
    Month.OCTOBER: ["октябр", "october", "oct"],
    Month.NOVEMBER: ["ноябр", "november", "nov"],
    Month.DECEMBER: ["декабр", "december", "dec"],
}

_SEASON_TOKENS: dict[Season, list[str]] = {
    Season.WINTER: ["зим", "winter"],
    Season.SPRING: ["весн", "spring"],
    Season.SUMMER: ["лет", "summer"],
    Season.AUTUMN: ["осен", "autumn", "fall"],
}

_MONTH_NUMBER: dict[Month, int] = {
    Month.JANUARY: 1,
    Month.FEBRUARY: 2,
    Month.MARCH: 3,
    Month.APRIL: 4,
    Month.MAY: 5,
    Month.JUNE: 6,
    Month.JULY: 7,
    Month.AUGUST: 8,
    Month.SEPTEMBER: 9,
    Month.OCTOBER: 10,
    Month.NOVEMBER: 11,
    Month.DECEMBER: 12,
}

# Токены, из которых агент понимает «море / пляж» и т.п.
_VIBE_TOKENS: dict[str, list[str]] = {
    "beach": ["пляж", "море", "морск", "beach", "sea"],
    "history": ["истор", "древн", "history", "историческ"],
    "architecture": ["архитектур", "architecture"],
    "nature": ["природ", "nature", "горы", "лес"],
    "culture": ["культур", "culture", "музе"],
    "food": ["еда", "кухн", "гастроном", "food", "ресторан"],
    "nightlife": ["ночн", "тусов", "вечерин", "nightlife", "клуб"],
    "relax": ["спокойн", "тих", "расслаб", "relax", "уединен"],
    "romance": ["романт", "romance", "свадь", "медовый"],
    "family": ["семь", "ребен", "ребён", "дет", "family"],
    "adventure": ["приключ", "adventure", "экстрим"],
    "shopping": ["шопинг", "shopping", "магазин"],
    "warm_weather": ["тепл", "жарк", "тёпл"],
    "wellness": ["спа ", "wellness", "оздоров", "йог"],
    "city": ["город", "city"],
    "canals": ["канал", "canals"],
    "sea": ["море", "морск"],
    "all_inclusive": ["все включено", "всё включено", "all inclusive"],
    "northern_lights": ["северн", "сияни"],
}

# Токены ограничений (constraints).
_CONSTRAINT_TOKENS: dict[str, list[str]] = {
    "with_child": ["с ребен", "с ребён", "с дет", "с малыш"],
    "limited_mobility": ["не могу много ходить", "ограничен", "инвалид", "коляск"],
    "accessible_hotel": ["доступн", "безбарьерн", "accessible"],
    "no_night_flights": ["без ночных", "не ночн", "днем", "днём"],
    "no_stops": ["без пересад", "прямой рейс", "прямой перелет", "no stops"],
    "vegetarian": ["вегетариан", "vegetarian"],
}

_HOTEL_REQ_TOKENS: dict[str, list[str]] = {
    "center": ["в центре", "центр", "center"],
    "pool": ["бассейн", "pool"],
    "breakfast": ["завтрак", "breakfast", "питание"],
    "sea_view": ["вид на море", "sea view"],
    "spa": ["спа", "spa"],
    "all_inclusive": ["все включено", "всё включено", "all inclusive"],
}

_CURRENCY_TOKENS: dict[Currency, list[str]] = {
    Currency.EUR: ["евро", "eur", "€"],
    Currency.USD: ["доллар", "usd", "$"],
    Currency.RUB: ["рубл", "rub", "₽", "тыс", "тысяч"],
    Currency.TRY: ["лира", "try", "₺"],
    Currency.AED: ["дирхам", "aed"],
    Currency.GEL: ["лари", "gel"],
    Currency.THB: ["бат", "thb"],
    Currency.EGP: ["фунт", "egp"],
}


def _detect_transport(text: str) -> TransportType | None:
    lowered = text.lower()
    if any(t in lowered for t in ["пересад", "самолет", "самолёт", "авиа", "plane", "fly", "перелет", "перелёт", "без пересад"]):
        return TransportType.PLANE
    if any(t in lowered for t in ["поезд", "train", "жд"]):
        return TransportType.TRAIN
    if any(t in lowered for t in ["автобус", "bus"]):
        return TransportType.BUS
    if any(t in lowered for t in ["машин", "авто", "car"]):
        return TransportType.CAR
    return None


def _extract_months(text: str) -> list[Month] | None:
    lowered = text.lower()
    found: list[Month] = []
    for month, tokens in _MONTH_TOKENS.items():
        if any(tok in lowered for tok in tokens):
            found.append(month)
    return found or None


def _extract_seasons(text: str) -> list[Season] | None:
    lowered = text.lower()
    found: list[Season] = []
    for season, tokens in _SEASON_TOKENS.items():
        if any(tok in lowered for tok in tokens):
            found.append(season)
    return found or None


_NUM_WORDS: dict[str, int] = {
    "один": 1, "одна": 1, "двоих": 2, "двое": 2, "два": 2, "две": 2,
    "трое": 3, "три": 3, "четверо": 4, "четыре": 4, "пятеро": 5, "пять": 5,
    "шестеро": 6, "шесть": 6, "семеро": 7, "семь": 7, "восемь": 8,
}


def _word_to_int(token: str) -> int | None:
    return _NUM_WORDS.get(token)


def _extract_travelers(text: str) -> tuple[int | None, tuple[int, int] | None]:
    """Извлечь число путешественников или диапазон."""
    lowered = text.lower()

    people_markers = [
        "нас", "человек", "чел", "взросл", "гост", "путешеств",
        "едет", "едим", "поедем", "поедем", "будет", "поедут",
    ]
    has_people_context = any(k in lowered for k in people_markers)

    # Диапазон: "нас от 2 до 5", "2-4 человека" — только при наличии маркера.
    range_match = re.search(r"(?:от\s+)?(\d+)\s*(?:до|[-–—])\s*(\d+)(\s+[а-яё]+)?", lowered)
    if range_match and has_people_context:
        lo, hi = int(range_match.group(1)), int(range_match.group(2))
        trailing = (range_match.group(3) or "").strip()
        # Исключаем даты вида "10-17 августа".
        is_date_like = any(
            tok in trailing for toks in _MONTH_TOKENS.values() for tok in toks
        )
        if not is_date_like and 1 <= lo <= hi <= 20:
            return None, (lo, hi)

    # "нас двое/трое/четверо"
    for word, value in _NUM_WORDS.items():
        if re.search(rf"\b{word}\b", lowered):
            if has_people_context:
                return value, None
            if word in {"двое", "двоих", "трое", "три", "четверо", "четыре", "пятеро", "пять", "шестеро", "семеро"}:
                return value, None

    # "2 человека"
    num_match = re.search(r"(\d+)\s*(?:человек|чел\.?|взросл|гост|путешеств)", lowered)
    if num_match:
        return int(num_match.group(1)), None

    # "нас 4"
    people_context = re.search(r"(?:нас|наших)\s+(\d+)", lowered)
    if people_context:
        return int(people_context.group(1)), None

    return None, None


def _extract_duration(text: str) -> int | None:
    lowered = text.lower()
    # "на неделю", "7 дней/ночей", "на 10 дней"
    if re.search(r"\bнедел", lowered):
        weeks = re.search(r"(\d+)\s*недел", lowered)
        if weeks:
            return int(weeks.group(1)) * 7
        return 7
    m = re.search(r"(?:на\s+)?(\d+)\s*(?:дн|ден|ноч|night|day)", lowered)
    if m:
        return int(m.group(1))
    return None


def _extract_budget(text: str) -> tuple[float | None, tuple[float, float] | None, Currency | None]:
    lowered = text.lower().replace("\u00a0", " ")
    currency = None
    for cur, tokens in _CURRENCY_TOKENS.items():
        if any(tok in lowered for tok in tokens):
            currency = cur
            break

    # Обработка "тысяч"/"тыс"/"к" множителя.
    def normalize(num_str: str, context: str) -> float:
        value = float(num_str.replace(" ", "").replace(",", "."))
        if any(k in context for k in ["тысяч", "тыс", "к ", "k "]) or re.search(r"\d\s*к\b", context):
            if value < 1000:
                value *= 1000
        return value

    # Явные бюджетные маркеры (без общих слов вроде "между").
    budget_words = [
        "бюджет", "лимит", "потрат", "потрач",
        "тысяч", "тыс", "евро", "доллар", "рубл", "€", "$", "₽",
    ]
    has_budget_context = any(k in lowered for k in budget_words)

    def _is_date_range(raw: str) -> bool:
        # Не даёт принять "10-17 августа" за бюджет.
        tail = lowered.split(raw, 1)[-1][:20]
        return any(tok in tail for toks in _MONTH_TOKENS.values() for tok in toks)

    # Диапазон "100-150 тысяч", "150-200 тысяч"
    rng = re.search(
        r"(\d[\d\s]*)\s*(?:[-–—]|и|до)\s*(\d[\d\s]*)\s*(тысяч|тыс|к\b|евро|доллар|рубл|€|\$|₽)?",
        lowered,
    )
    if rng and has_budget_context:
        lo_raw, hi_raw, unit = rng.group(1), rng.group(2), rng.group(3) or ""
        if not _is_date_range(rng.group(0)):
            lo = normalize(lo_raw, unit or lowered)
            hi = normalize(hi_raw, unit or lowered)
            if 0 < lo < hi:
                return None, (lo, hi), currency

    # Одиночное число бюджета. Требуем, чтобы число было явно связано с
    # деньгами: либо рядом стоит валюта/тысячи, либо перед ним идёт
    # бюджетный маркер ("бюджет", "до", "около", "примерно").
    money_unit = r"(тысяч|тыс|к\b|евро|доллар|рубл|€|\$|₽)"
    # Число + денежная единица.
    single = re.search(rf"(\d[\d\s]*)\s*{money_unit}", lowered)
    if single:
        num = normalize(single.group(1), single.group(2) or lowered)
        if num > 0:
            return num, None, currency
    # Бюджетный маркер + число (единица опциональна).
    marker = re.search(
        r"(?:бюджет|лимит|потрат\w*|потрач\w*|до|около|примерно|максимум)\D{0,12}?(\d[\d\s]*)",
        lowered,
    )
    if marker:
        num = normalize(marker.group(1), lowered)
        if num > 0:
            return num, None, currency
    return None, None, currency


def _extract_dates(text: str, reference_year: int) -> list[date] | None:
    """Извлечь точные даты из формата "10-17 августа" / "5–12 сентября"."""
    lowered = text.lower()

    # Формат "10-17 августа" или "с 10 по 17 июля"
    m = re.search(
        r"(?:с\s+)?(\d{1,2})\s*(?:[-–—]|по)\s*(\d{1,2})\s+([а-яё]+)",
        lowered,
    )
    if m:
        d1, d2, month_tok = int(m.group(1)), int(m.group(2)), m.group(3)
        month = _month_from_token(month_tok)
        if month:
            year = reference_year
            try:
                return [date(year, month, d1), date(year, month, d2)]
            except ValueError:
                return None

    # Формат ISO: 2026-08-10 .. 2026-08-17
    iso = re.findall(r"(\d{4}-\d{2}-\d{2})", lowered)
    if iso:
        return [date.fromisoformat(x) for x in iso]

    return None


def _month_from_token(token: str) -> int | None:
    for month, tokens in _MONTH_TOKENS.items():
        if any(tok in token for tok in tokens):
            return _MONTH_NUMBER[month]
    return None


def _extract_preferences(text: str) -> list[Preference] | None:
    lowered = text.lower()
    found: list[Preference] = []
    seen: set[str] = set()
    for vibe, tokens in _VIBE_TOKENS.items():
        if any(tok in lowered for tok in tokens) and vibe not in seen:
            # Не считаем "sea" отдельным, если уже есть "beach".
            found.append(Preference(name=vibe, priority=Priority.MEDIUM))
            seen.add(vibe)
    # Убираем дубли смысла beach/sea.
    names = {p.name for p in found}
    if "beach" in names and "sea" in names:
        found = [p for p in found if p.name != "sea"]
    return found or None


def _extract_constraints(text: str) -> list[Constraint] | None:
    lowered = text.lower()
    found: list[Constraint] = []
    for name, tokens in _CONSTRAINT_TOKENS.items():
        if any(tok in lowered for tok in tokens):
            found.append(Constraint(name=name, value=True, hard=False))
    return found or None


def _extract_hotel_requirements(text: str) -> list[str] | None:
    lowered = text.lower()
    found: list[str] = []
    for req, tokens in _HOTEL_REQ_TOKENS.items():
        if any(tok in lowered for tok in tokens) and req not in found:
            found.append(req)
    # "хороший отель" → примерно comfort/center не задаём детерминированно,
    # но отметим как общее требование качества.
    if "хорош" in lowered and "отель" in lowered and "quality" not in found:
        found.append("quality")
    return found or None


def _extract_origin(text: str) -> str | None:
    lowered = text.lower()
    if not any(k in lowered for k in ["вылета", "из ", "лечу", "выезжа", "отправл", "старт", "летим из", "from"]):
        # Только если явно упомянут известный origin-город с контекстом.
        for origin in ds.ORIGINS:
            if origin.city.lower() in lowered:
                return origin.city
        return None
    for origin in ds.ORIGINS:
        if origin.city.lower() in lowered:
            return origin.city
    # Русские названия origin.
    for o in ds.ORIGINS:
        for stem in ds.CITY_ALIASES.get(o.city.lower(), []):
            if stem in lowered:
                return o.city
    return None


def _extract_destination(text: str) -> tuple[str | None, str | None]:
    """Вернуть (city, country) если найдены в тексте.

    Возвращает город только если он есть в mock dataset. Если найден только
    country — вернёт country, а city=None.
    """
    lowered = text.lower()
    # Сначала пытаемся найти известный город.
    for dest in ds.DESTINATIONS:
        if dest.city.lower() in lowered:
            return dest.city, dest.country
    for city_key, stems in ds.CITY_ALIASES.items():
        for stem in stems:
            if stem in lowered:
                if d := ds.get_destination_by_city(city_key):
                    return d.city, d.country
    # Иначе пытаемся найти страну.
    country = ds.resolve_country(text)
    if country:
        return None, country
    return None, None


def extract_user_request(
    message: str,
    current_request=None,
    reference_year: int = 2026,
) -> UserRequestPatch:
    """Извлечь все доступные параметры из сообщения пользователя.

    :param message: последнее сообщение пользователя.
    :param current_request: текущий ``UserRequest`` (используется только для
        контекстного разрешения года/месяца; не мутируется).
    :param reference_year: год по умолчанию для дат без года.
    :returns: :class:`UserRequestPatch` с только найденными значениями.
    """
    text = message or ""
    patch = UserRequestPatch()

    city, country = _extract_destination(text)
    if city:
        patch.destination = city
        if country:
            patch.destination_country = country
    elif country:
        patch.destination_country = country

    origin = _extract_origin(text)
    if origin:
        patch.origin = origin

    exact = _extract_dates(text, reference_year)
    if exact:
        patch.exact_dates = exact

    months = _extract_months(text)
    if months:
        patch.month = months

    seasons = _extract_seasons(text)
    if seasons:
        patch.season = seasons

    duration = _extract_duration(text)
    if duration:
        patch.duration = duration

    travelers, traveler_range = _extract_travelers(text)
    if traveler_range:
        patch.traveler_range = traveler_range
    elif travelers:
        patch.travelers = travelers

    budget, budget_range, currency = _extract_budget(text)
    if budget_range:
        patch.budget_range = budget_range
    elif budget:
        patch.budget = budget
    if currency:
        patch.currency = currency

    preferences = _extract_preferences(text)
    if preferences:
        patch.preferences = preferences

    constraints = _extract_constraints(text)
    if constraints:
        patch.constraints = constraints

    hotel_reqs = _extract_hotel_requirements(text)
    if hotel_reqs:
        patch.hotel_requirements = hotel_reqs

    transport = _detect_transport(text)
    if transport:
        patch.preferred_transport = transport

    return patch


__all__ = ["extract_user_request"]

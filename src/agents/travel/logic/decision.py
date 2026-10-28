"""
Deterministic бизнес-логика планирования поездки.

Здесь реализованы:

* :func:`merge_user_request` — слияние текущего запроса с патчем;
* :func:`validate_travel_request` — единая проверка готовности (сверка/поиск);
* :func:`suggest_destinations` — генерация вариантов направлений;
* :func:`suggest_date_ranges` — генерация конкретных периодов из month+duration;
* :func:`resolve_selections` — разбор пользовательского выбора среди кандидатов;
* :func:`is_confirmation_message` — распознавание подтверждения сверки;
* :func:`trip_option_key` / :func:`dedupe_trip_options` — дедупликация результатов.

Критические проверки (destination, dates, origin, travelers, budget,
preferences, confirmation) выполняются кодом, а не LLM.
"""

from __future__ import annotations

import calendar
import re
from datetime import date

from agents.travel.tools import mock_dataset as ds
from domain.common import Month
from domain.planning import (
    DateRange,
    DestinationCandidate,
    SelectionResult,
    UserRequestPatch,
    ValidationResult,
)
from domain.request import UserRequest

# Устаревший контракт: бюджетные сценарии больше не генерируются неявно.
# Оставлено для обратной совместимости импортов.
DEFAULT_BUDGET_SCENARIOS: dict[str, float] = {
    "economy": 100000.0,
    "optimal": 150000.0,
    "comfort": 250000.0,
}

MIN_REALISTIC_BUDGET_RUB: float = 5000.0

PREFERENCE_QUESTION = (
    "Давай сначала поймём, какой отдых тебе ближе: история и архитектура, "
    "море и пляжи, природа, гастрономия, ночная жизнь, спокойный отдых, "
    "приключения — или хочется чего-то совсем другого?"
)

_MONTH_NUMBER: dict[Month, int] = {
    Month.JANUARY: 1, Month.FEBRUARY: 2, Month.MARCH: 3, Month.APRIL: 4,
    Month.MAY: 5, Month.JUNE: 6, Month.JULY: 7, Month.AUGUST: 8,
    Month.SEPTEMBER: 9, Month.OCTOBER: 10, Month.NOVEMBER: 11, Month.DECEMBER: 12,
}

_SCALAR_FIELDS = [
    "origin",
    "destination",
    "destination_country",
    "destination_ambiguous",
    "duration",
    "currency",
    "preferred_transport",
    "preference_status",
    "budget_mode",
]

# Поля, изменение которых инвалидирует подтверждение и результаты поиска.
SEARCH_CRITICAL_FIELDS = [
    "origin",
    "destination",
    "destination_country",
    "duration",
    "travelers",
    "traveler_range",
    "adults",
    "children",
    "budget",
    "budget_range",
    "budget_mode",
    "currency",
    "preferences",
    "constraints",
    "hotel_requirements",
    "preference_status",
]


# --------------------------------------------------------------------------
# Слияние запроса
# --------------------------------------------------------------------------
def merge_user_request(
        current: UserRequest | None,
        patch: UserRequestPatch,
) -> UserRequest:
    """Объединить текущий ``UserRequest`` с патчем.

    ``None`` в патче НЕ стирает значение. Явные значения из патча заменяют
    старые. Диапазоны сохраняются как диапазоны (нижняя граница не теряется),
    коллекции поддерживают дедупликацию и явную отмену.
    """
    base = current.model_copy(deep=True) if current is not None else UserRequest()

    for field in _SCALAR_FIELDS:
        value = getattr(patch, field, None)
        if value is not None:
            setattr(base, field, value)

    # Явный выбор города снимает неоднозначность, а упоминание нескольких
    # городов делает направление невыбранным.
    if patch.destination is not None:
        base.destination_ambiguous = False
    elif patch.destination_ambiguous:
        base.destination = None
        base.destination_country = None

    # --- Путешественники ---
    if patch.traveler_range is not None:
        base.traveler_range = (int(patch.traveler_range[0]), int(patch.traveler_range[1]))
        base.travelers = max(base.traveler_range)
    elif patch.travelers is not None:
        base.travelers = patch.travelers
        base.traveler_range = None
    if patch.adults is not None:
        base.adults = patch.adults
    if patch.children is not None:
        base.children = patch.children
    if (
            patch.travelers is not None
            or patch.traveler_range is not None
            or patch.adults is not None
            or patch.children is not None
    ):
        base.travelers_provided = True

    # --- Бюджет: диапазон не превращается в точную сумму ---
    if patch.budget_range is not None:
        base.budget_range = (float(patch.budget_range[0]), float(patch.budget_range[1]))
        base.budget = None
        base.budget_mode = "specified"
    elif patch.budget is not None:
        base.budget = patch.budget
        base.budget_range = None
        base.budget_mode = "specified"
    elif patch.budget_mode is not None:
        base.budget_mode = patch.budget_mode

    # --- Даты ---
    if patch.exact_dates:
        base.date_preferences.exact_dates = list(patch.exact_dates)
        base.date_preferences.start_date = None
        base.date_preferences.end_date = None
    if patch.month:
        base.date_preferences.month = list(patch.month)
    if patch.season:
        base.date_preferences.season = list(patch.season)

    # --- Предпочтения: сначала отмена, затем добавление ---
    removed_prefs = set(patch.removed_preferences or [])
    if removed_prefs:
        base.preferences = [p for p in base.preferences if p.name not in removed_prefs]
    if patch.preferences:
        existing = {p.name for p in base.preferences}
        for pref in patch.preferences:
            if pref.name in removed_prefs:
                continue
            if pref.name not in existing:
                base.preferences.append(pref)
                existing.add(pref.name)
    if base.preference_status == "unknown" and base.preferences:
        base.preference_status = "specified"

    # --- Ограничения ---
    if patch.removed_constraints:
        removed = set(patch.removed_constraints)
        base.constraints = [c for c in base.constraints if c.name not in removed]
    if patch.constraints:
        existing_c = {c.name for c in base.constraints}
        for con in patch.constraints:
            if con.name not in existing_c:
                base.constraints.append(con)
                existing_c.add(con.name)

    # --- Требования к отелю ---
    removed_hotel = set(patch.removed_hotel_requirements or [])
    if removed_hotel:
        base.hotel_requirements = [r for r in base.hotel_requirements if r not in removed_hotel]
    if patch.hotel_requirements:
        for req in patch.hotel_requirements:
            if req in removed_hotel:
                continue
            if req not in base.hotel_requirements:
                base.hotel_requirements.append(req)

    # --- Явная очистка полей ---
    for field in patch.clear_fields:
        if field == "destination":
            base.destination = None
            base.destination_country = None
            base.destination_ambiguous = False
        elif field == "budget":
            base.budget = None
            base.budget_range = None
            base.budget_mode = "unknown"
        elif field == "travelers":
            base.travelers = 1
            base.traveler_range = None
            base.travelers_provided = False
            base.adults = None
            base.children = None
        elif field in _SCALAR_FIELDS:
            setattr(base, field, UserRequest.model_fields[field].default)
        elif field == "preferences":
            base.preferences = []
            base.preference_status = "unknown"
        elif field == "constraints":
            base.constraints = []
        elif field == "hotel_requirements":
            base.hotel_requirements = []
        elif field == "exact_dates":
            base.date_preferences.exact_dates = None

    return base


# --------------------------------------------------------------------------
# Проверка готовности
# --------------------------------------------------------------------------
def validate_travel_request(
        request: UserRequest | None,
        *,
        destination_selected: bool = False,
        confirmed_date_range: DateRange | None = None,
        travelers_provided: bool | None = None,
        request_confirmed: bool = False,
        reference_date: date | None = None,
) -> ValidationResult:
    """Единая deterministic-проверка готовности запроса.

    Возвращает два независимых рубежа:

    * ``ready_for_confirmation`` — все обязательные данные собраны;
    * ``ready_for_search`` — данные собраны И пользователь подтвердил сверку.

    Параметр ``travelers_provided`` переопределяет признак из ``UserRequest``
    (нужно для вызовов из графа). ``None`` означает «взять из запроса».
    """
    reference_date = reference_date or date.today()

    if request is None:
        missing = ["destination", "dates", "travelers", "budget"]
        return ValidationResult(
            ready=False,
            ready_for_confirmation=False,
            ready_for_search=False,
            stage="preferences",
            missing=missing,
            missing_fields=list(missing),
            decisions_required=["preference_selection"],
            questions=[PREFERENCE_QUESTION],
            budget_mode="unknown",
            preference_status="unknown",
            reason="Запрос ещё не начат.",
        )

    missing: list[str] = []
    decisions: list[str] = []

    pref_status = request.preference_status
    if pref_status == "unknown" and request.preferences:
        pref_status = "specified"

    # --- Destination ---
    known_city = ds.get_destination_by_city(request.destination) if request.destination else None
    destination_ok = False
    first_stage = (
            request.destination is None
            and not request.destination_ambiguous
            and pref_status == "unknown"
    )

    if request.destination:
        if not known_city:
            missing.append("destination_unknown")
            decisions.append("destination_selection")
        elif destination_selected:
            destination_ok = True
        else:
            decisions.append("destination_selection")
    else:
        if not first_stage:
            missing.append("destination")
            decisions.append("destination_selection")

    # --- Origin ---
    if not request.origin:
        missing.append("origin")

    # --- Dates ---
    exact = list(request.date_preferences.exact_dates or [])
    date_ok = False
    if len(exact) >= 2 and exact[0] <= exact[1]:
        date_ok = True
    elif confirmed_date_range is not None:
        date_ok = True
    elif request.date_preferences.month and request.duration:
        decisions.append("date_selection")
    else:
        missing.append("dates")

    # --- Travelers ---
    effective_provided = (
        request.travelers_provided if travelers_provided is None else travelers_provided
    )
    travelers_ok = bool(effective_provided) and request.travelers >= 1
    if not travelers_ok:
        missing.append("travelers")

    # --- Budget ---
    budget_mode = request.budget_mode
    if budget_mode == "unknown" and (
            request.budget is not None or request.budget_range is not None
    ):
        budget_mode = "specified"

    budget_val = request.budget
    if budget_val is None and request.budget_range:
        budget_val = request.budget_range[1]

    budget_rub = ds.to_rub(budget_val, request.currency) if budget_val is not None else None
    budget_unrealistic = (
            budget_mode == "specified"
            and budget_rub is not None
            and budget_rub < MIN_REALISTIC_BUDGET_RUB
    )

    if budget_unrealistic:
        missing.append("budget_unrealistic")
        budget_ok = False
    elif "joke_budget" in request.hotel_requirements:
        missing.append("budget")
        budget_ok = False
    else:
        budget_ok = budget_mode in {"specified", "no_limit", "flexible_scenarios"}
        if not budget_ok:
            missing.append("budget")

    # --- Preferences ---
    preference_ok = pref_status in {"specified", "no_preference"}
    if destination_ok:
        # Явно выбранный пользователем город делает предпочтения необязательными.
        preference_ok = True

    ready_for_confirmation = (
            not first_stage
            and destination_ok
            and bool(request.origin)
            and date_ok
            and travelers_ok
            and budget_ok
            and preference_ok
            and not decisions
    )
    ready_for_search = ready_for_confirmation and request_confirmed

    if first_stage:
        stage = "preferences"
    elif "destination_selection" in decisions:
        stage = "destination"
    elif "date_selection" in decisions:
        stage = "dates"
    elif not ready_for_confirmation:
        stage = "details"
    elif not request_confirmed:
        stage = "confirmation"
    else:
        stage = "ready"

    questions = _build_questions(missing, decisions, stage, request)

    if first_stage:
        reason = "Сначала нужно определить предпочтения (вайб) поездки."
    elif ready_for_search:
        reason = "Запрос подтверждён и готов к поиску."
    elif ready_for_confirmation:
        reason = "Все данные собраны — нужна итоговая сверка с пользователем."
    else:
        reason = "Требуются уточнения."

    return ValidationResult(
        ready=ready_for_search,
        ready_for_confirmation=ready_for_confirmation,
        ready_for_search=ready_for_search,
        stage=stage,
        missing=missing,
        missing_fields=list(missing),
        decisions_required=decisions,
        questions=questions,
        budget_scenarios=[],
        budget_mode=budget_mode,
        preference_status=pref_status,
        reason=reason,
    )


def _build_questions(
        missing: list[str],
        decisions: list[str],
        stage: str,
        request: UserRequest | None = None,
) -> list[str]:
    if stage == "preferences":
        return [PREFERENCE_QUESTION]
    if stage in {"confirmation", "ready"}:
        return []

    questions: list[str] = []
    if "destination_unknown" in missing:
        dest_name = getattr(request, "destination", "Этот город")
        questions.append(
            f"К сожалению, сейчас мы не организуем туры в **{dest_name}** (работаем по направлениям: Сочи, Калининград, Санкт-Петербург, Стамбул, Анталья). Выберите город из доступных вариантов."
        )
    if "destination" in missing and "destination_unknown" not in missing:
        questions.append("В какой город или страну планируете поездку?")
    if "destination_selection" in decisions and "destination_unknown" not in missing:
        questions.append("Какой из предложенных городов выбираем?")
    if "dates" in missing:
        questions.append("На какие даты планируете поездку?")
    if "date_selection" in decisions:
        questions.append("Какой из предложенных периодов подходит?")
    if "travelers" in missing:
        questions.append("Сколько человек поедет?")

    # Реакция на бюджет
    if "budget_unrealistic" in missing and request:
        amt = int(request.budget) if request.budget else (
            int(request.budget_range[1]) if request.budget_range else 100
        )
        possible_thousands = amt * 1000
        questions.append(
            f"Кажется, в сумме бюджета ({amt:,.0f} ₽) опечатка — вы имели в виду {amt} тысяч рублей ({possible_thousands:,.0f} ₽) или другую сумму?"
        )
    elif "budget" in missing:
        questions.append(
            "Какой у вас ориентировочный бюджет (валюта) — или бюджет не ограничен?"
        )

    if "origin" in missing:
        questions.append("Из какого города вылетаете?")
    return questions


# --------------------------------------------------------------------------
# Подбор направлений и периодов
# --------------------------------------------------------------------------
def suggest_destinations(
    request: UserRequest | None,
    *,
    country: str | None = None,
    limit: int = 3,
) -> list[DestinationCandidate]:
    """Сгенерировать подходящие направления с учётом реальной температуры воды и воздуха."""
    prefs = set()
    season = None
    month = None
    if request is not None:
        prefs = {p.name for p in request.preferences}
        if request.date_preferences.season:
            season = request.date_preferences.season[0]
        if request.date_preferences.month:
            month = request.date_preferences.month[0]

    target_country = country or (request.destination_country if request else None)
    pool = ds.DESTINATIONS
    if target_country:
        pool = ds.cities_in_country(target_country)
    if not pool:
        pool = ds.DESTINATIONS

    is_beach_request = any(p in prefs for p in ["beach", "sea", "warm_weather"])
    m_num = _MONTH_NUMBER.get(month) if month else None

    scored: list[tuple[float, ds.Destination]] = []
    for dest in pool:
        score = 0.0
        for pref in prefs:
            if pref in dest.vibes:
                score += 2.0
        if season and season in dest.seasons:
            score += 1.0
        if month and season is None:
            guessed = _guess_season(month)
            if guessed in dest.seasons:
                score += 1.0
        if "warm_weather" in prefs and "beach" in dest.vibes:
            score += 1.0

        # Климатическая коррекция: проверяем реальную температуру воды в этот месяц
        if m_num and is_beach_request:
            w = ds.get_weather_info(dest.city, m_num)
            if w and "water_temp" in w:
                if w["water_temp"] >= 20:
                    score += 4.0   # Тёплое море для купания (например, Анталья в ноябре +21°C)
                elif w["water_temp"] < 18:
                    score -= 6.0   # Холодная вода (Калининград +8°C, Сочи +16°C — не для купания!)

        scored.append((score, dest))

    scored.sort(key=lambda x: (-x[0], x[1].city))
    if scored and scored[0][0] > 0:
        chosen = [d for _, d in scored[:limit]]
    else:
        chosen = _contrastive_selection(list(pool), limit)

    return [
        DestinationCandidate(
            city=d.city,
            country=d.country,
            iata=d.iata,
            reason=_reason_for(d, prefs, m_num),
        )
        for d in chosen
    ]


def _guess_season(month: Month):
    from domain.common import Season

    m = _MONTH_NUMBER[month]
    if m in (12, 1, 2):
        return Season.WINTER
    if m in (3, 4, 5):
        return Season.SPRING
    if m in (6, 7, 8):
        return Season.SUMMER
    return Season.AUTUMN


_VIBE_DESCRIPTIONS = {
    "food": "гастрономические открытия, аутентичная кухня и колоритные рестораны",
    "beach": "пляжный отдых, солнце и теплое море",
    "sea": "морские пейзажи и прогулки по побережью",
    "history": "богатая история, старинная архитектура и музеи",
    "architecture": "уникальная архитектура и атмосферные улочки",
    "nature": "живописная природа, горы и чистый воздух",
    "culture": "культурные достопримечательности, театры и выставки",
    "relax": "спокойный отдых, спа и восстановление сил",
    "nightlife": "яркая ночная жизнь, бары и вечеринки",
    "family": "комфортный семейный отдых с развитой инфраструктурой",
    "shopping": "отличный шопинг и колоритные рынки",
    "all_inclusive": "отдых по системе «всё включено» без лишних забот",
}

_CITY_HIGHLIGHTS = {
    "Сочи": "Черноморское побережье, реликтовые субтропики и всесезонные горы",
    "Калининград": "Балтийское море, Куршская коса, сосновые леса и европейская архитектура",
    "Санкт-Петербург": "музеи мирового уровня, набережные Невы, разводные мосты и театры",
    "Стамбул": "Босфор, восточный колорит, великая история и непревзойденная гастрономия",
    "Анталья": "бирюзовое Средиземное море, пляжи, Таврские горы и живописный Старый город",
}


def _reason_for(dest: ds.Destination, prefs: set[str], month_num: int | None = None) -> str:
    """Сформировать реалистичное описание без обещания тёплого моря в холодный сезон."""
    # Проверяем температуру воды, если запрос был про море
    if month_num:
        w = ds.get_weather_info(dest.city, month_num)
        if w and w.get("water_temp", 25) < 19:
            if "spa" in dest.vibes or "wellness" in prefs:
                return "СПА-отдых, подогреваемые бассейны и чистый морской воздух"
            return _CITY_HIGHLIGHTS.get(dest.city, "экскурсии, природа и прогулки по побережью")

    matched = [v for v in dest.vibes if v in prefs]
    if matched:
        desc = _VIBE_DESCRIPTIONS.get(matched[0])
        if desc:
            return desc
        return "отличный выбор под ваши предпочтения"

    return _CITY_HIGHLIGHTS.get(dest.city, "комфортный отдых и новые впечатления")


def _contrastive_selection(pool: list, limit: int) -> list:
    """Выбрать контрастные города (разные price_level и основные vibes)."""
    by_price: dict[str, list] = {}
    for d in pool:
        by_price.setdefault(d.price_level.value, []).append(d)
    chosen = []
    for level in ["budget", "medium", "premium"]:
        if by_price.get(level):
            chosen.append(by_price[level][0])
        if len(chosen) >= limit:
            break
    for d in pool:
        if len(chosen) >= limit:
            break
        if d not in chosen:
            chosen.append(d)
    return chosen[:limit]


def _upcoming_year(month_num: int, reference_date: date) -> int:
    if month_num < reference_date.month:
        return reference_date.year + 1
    if month_num == reference_date.month:
        # Все стартовые дни (5/12/19/26) уже прошли?
        if not any(day >= reference_date.day for day in (5, 12, 19, 26)):
            return reference_date.year + 1
    return reference_date.year


def suggest_date_ranges(
        request: UserRequest,
        *,
        count: int = 3,
        year: int | None = None,
        reference_date: date | None = None,
) -> list[DateRange]:
    """Сгенерировать конкретные периоды из month + duration."""
    if not request.date_preferences.month or not request.duration:
        return []

    if reference_date is None:
        # Явно заданный год (тесты/демо) считаем опорной точкой на его начало,
        # иначе используем текущую дату.
        reference_date = date(year, 1, 1) if year else date.today()
    month = request.date_preferences.month[0]
    month_num = _MONTH_NUMBER[month]
    duration = max(1, request.duration)
    yr = year or _upcoming_year(month_num, reference_date)

    days_in_month = calendar.monthrange(yr, month_num)[1]
    starts = [5, 12, 19, 26]
    ranges: list[DateRange] = []
    for start_day in starts:
        try:
            start = date(yr, month_num, start_day)
        except ValueError:
            continue
        if start < reference_date:
            continue
        end_day = start_day + duration
        if end_day <= days_in_month:
            ranges.append(
                DateRange(
                    start_date=start,
                    end_date=date(yr, month_num, end_day),
                )
            )
        else:
            next_month = month_num + 1
            nxt_year = yr
            if next_month > 12:
                next_month = 1
                nxt_year += 1
            overflow = end_day - days_in_month
            ranges.append(
                DateRange(
                    start_date=start,
                    end_date=date(nxt_year, next_month, overflow),
                )
            )
        if len(ranges) >= count:
            break
    return ranges


# --------------------------------------------------------------------------
# Разбор выбора пользователя
# --------------------------------------------------------------------------
_ORDINAL_WORDS = {
    "перв": 0,
    "втор": 1,
    "трет": 2,
    "четверт": 3,
    "пят": 4,
}

_ORDINAL_TOKEN = r"(\d+|перв\w*|втор\w*|трет\w*|четверт\w*|пят\w*)"

# Слова-маркеры, идущие после чисел, которые НЕ относятся к выбору варианта
_UNIT_STOPWORDS = {
    "человек", "чел", "взросл", "гост", "дет", "ребен", "ребён",
    "дней", "дня", "ноч", "недел",
    "руб", "тыс", "к", "usd", "eur", "евро", "доллар",
    "январ", "феврал", "март", "апрел", "ма", "мая", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр",
}


def _ordinal_index(token: str) -> int | None:
    token = token.strip().lower()
    if token.isdigit():
        value = int(token)
        return value - 1 if value >= 1 else None
    for stem, idx in _ORDINAL_WORDS.items():
        if token.startswith(stem):
            return idx
    return None


def _parse_ordinal_from_text(lowered: str, qualifiers: list[str]) -> int | None:
    """Универсальный поиск порядкового номера в любом порядке и контексте слов."""
    q_pattern = "|".join(qualifiers)

    # 1. Номер в самом начале строки со знаком: "1.", "1)", "1 -", "1,", "1: "
    # Работает для: "1. Планирую в эти выходные. Поедет 2 человека"
    m_punct = re.match(
        r"^\s*(?:давай|хочу|выберу|выбираю|пусть будет)?\s*([1-9]|перв\w*|втор\w*|трет\w*|четверт\w*|пят\w*)\s*[\.\)\-,:]",
        lowered,
    )
    if m_punct:
        idx = _ordinal_index(m_punct.group(1))
        if idx is not None:
            return idx

    # 2. Номер в начале строки через пробел, если дальше НЕ единица измерения:
    # "1 Стамбул", "1 едем", но НЕ "2 человека", НЕ "5 дней"
    m_space = re.match(
        r"^\s*(?:давай|хочу|выберу|выбираю|пусть будет)?\s*([1-9]|перв\w*|втор\w*|трет\w*|четверт\w*|пят\w*)\s+([а-яёa-z]+)",
        lowered,
    )
    if m_space:
        next_word = m_space.group(2)
        if not any(next_word.startswith(u) for u in _UNIT_STOPWORDS):
            idx = _ordinal_index(m_space.group(1))
            if idx is not None:
                return idx

    # 3. Номер перед словом: "первый вариант", "1-й вариант", "1 вариант", "первый город"
    m_qual1 = re.search(rf"\b({_ORDINAL_TOKEN})\s*(?:-?[а-яёa-z]+)?\s*(?:{q_pattern})\b", lowered)
    if m_qual1:
        idx = _ordinal_index(m_qual1.group(1))
        if idx is not None:
            return idx

    # 4. Слово перед номером: "вариант 1", "город первый", "номер 2"
    m_qual2 = re.search(rf"\b(?:{q_pattern})\s*№?\s*({_ORDINAL_TOKEN})\b", lowered)
    if m_qual2:
        idx = _ordinal_index(m_qual2.group(1))
        if idx is not None:
            return idx

    # 5. Глагол выбора + порядковое: "давай первый", "выберу 1", "хочу второй"
    m_verb = re.search(
        rf"(?:давай|выберу|выбираю|хочу|берем|берём|поедем в|едем в|пусть будет)\s+({_ORDINAL_TOKEN})\b",
        lowered,
    )
    if m_verb:
        idx = _ordinal_index(m_verb.group(1))
        if idx is not None:
            return idx

    # 6. Одиночное число/слово во всём сообщении: "1", "первый"
    m_single = re.fullmatch(rf"\s*({_ORDINAL_TOKEN})\s*", lowered)
    if m_single:
        idx = _ordinal_index(m_single.group(1))
        if idx is not None:
            return idx

    return None


def _qualified_ordinal(lowered: str, qualifiers: list[str]) -> int | None:
    if not qualifiers:
        return None
    pattern = rf"(?:{'|'.join(qualifiers)})\s*№?\s*{_ORDINAL_TOKEN}"
    m = re.search(pattern, lowered)
    if not m:
        return None
    return _ordinal_index(m.group(1))


def _bare_ordinal(lowered: str) -> int | None:
    m = re.fullmatch(rf"\s*{_ORDINAL_TOKEN}\s*", lowered)
    if not m:
        return None
    return _ordinal_index(m.group(1))


def _resolve_destination_choice(
        message: str,
        candidates: list[DestinationCandidate],
        *,
        date_expected: bool,
) -> str | None:
    if not candidates:
        return None
    lowered = (message or "").strip().lower()

    # Проверяем прямое название города или его алиасы
    for c in candidates:
        c_city = c.city.lower()
        if c_city in lowered:
            return c.city
        for stem in ds.CITY_ALIASES.get(c_city, []):
            if stem in lowered:
                return c.city

    # Ищем порядковый номер
    idx = _parse_ordinal_from_text(lowered, ["город", "вариант", "номер", "направление"])
    if idx is not None and 0 <= idx < len(candidates):
        return candidates[idx].city

    return None


def _resolve_date_choice(
        message: str,
        date_ranges: list[DateRange],
        *,
        destination_expected: bool,
        reference_date: date | None = None,
) -> DateRange | None:
    if not date_ranges:
        return None
    lowered = (message or "").strip().lower()

    idx = _parse_ordinal_from_text(lowered, ["даты", "дата", "период", "вариант", "номер"])
    if idx is not None and 0 <= idx < len(date_ranges):
        return date_ranges[idx]

    from agents.travel.logic.extraction import _extract_dates

    exact = _extract_dates(message or "", reference_date or date.today())
    if exact and len(exact) >= 2:
        return DateRange(start_date=exact[0], end_date=exact[1])
    return None


def resolve_selections(
        message: str,
        candidates: list[DestinationCandidate],
        date_ranges: list[DateRange] | None = None,
        *,
        reference_date: date | None = None,
) -> tuple[str | None, DateRange | None]:
    """Разобрать выбор города и периода одновременно.

    Числительные, описывающие путешественников/бюджет/даты, не считаются
    выбором города: для города требуется название или явный квалификатор
    («город 2», «вариант 3»).
    """
    date_ranges = date_ranges or []
    city = _resolve_destination_choice(
        message, candidates, date_expected=bool(date_ranges)
    )
    date_range = _resolve_date_choice(
        message,
        date_ranges,
        destination_expected=bool(candidates),
        reference_date=reference_date,
    )
    return city, date_range


def resolve_selection(
        message: str,
        candidates: list[DestinationCandidate],
        date_ranges: list[DateRange] | None = None,
        *,
        reference_date: date | None = None,
) -> SelectionResult:
    """Совместимая обёртка над :func:`resolve_selections`."""
    city, date_range = resolve_selections(
        message, candidates, date_ranges, reference_date=reference_date
    )
    if city:
        return SelectionResult(kind="destination", city=city, raw=message)
    if date_range:
        return SelectionResult(kind="date", date_range=date_range, raw=message)
    return SelectionResult(kind="unknown", raw=message)


# --------------------------------------------------------------------------
# Подтверждение и дедупликация результатов
# --------------------------------------------------------------------------
_CONFIRM_PATTERN = re.compile(
    r"^\s*(?:"
    r"да|ага|угу|верно|все верно|всё верно|подтверждаю|ок|окей|yes|yep|correct|"
    r"начинай|начинаем|начни|старт|погнали|поехали|запускай|ищи|ищем|поиск|"
    r"давай|вперед|вперёд|согласен|согласна|подходит|отлично|хорошо|готово|"
    r"вернемся|вернёмся|оформляем|к оформлению|к бронированию|дальше|продолжаем"
    r")\b",
    re.IGNORECASE,
)
_CONFIRM_NEGATIONS = [
    " но ", "нет,", "измени", "вместо", "кроме", "не так", "неверно", "подожди",
]


def is_confirmation_message(message: str) -> bool:
    """Распознать однозначное подтверждение итоговой сверки."""
    lowered = (message or "").strip().lower().replace("ё", "е")
    if not _CONFIRM_PATTERN.match(lowered):
        return False
    if any(marker in f" {lowered}" for marker in _CONFIRM_NEGATIONS):
        return False
    return True


def request_fingerprint(request: UserRequest | None) -> tuple:
    """Ключ search-критичных полей для инвалидации подтверждения."""
    if request is None:
        return ()
    return (
        request.origin,
        request.destination,
        request.destination_country,
        request.destination_ambiguous,
        request.duration,
        request.travelers,
        request.traveler_range,
        request.adults,
        request.children,
        request.budget,
        request.budget_range,
        request.budget_mode,
        request.currency,
        tuple(sorted(p.name for p in request.preferences)),
        tuple(sorted(c.name for c in request.constraints)),
        tuple(sorted(request.hotel_requirements)),
        request.preference_status,
        tuple(request.date_preferences.exact_dates or []),
        request.date_preferences.month,
        request.date_preferences.season,
    )


def build_search_key(
        request: UserRequest,
        dates: list[tuple[str, str | None]],
        *,
        budget_mode: str,
        budget_limit: float | None,
        currency: str | None,
) -> str:
    return "|".join(
        [
            str(request.origin),
            str(request.destination),
            ";".join(f"{dep}->{ret or ''}" for dep, ret in dates),
            str(request.travelers),
            budget_mode,
            str(budget_limit),
            str(currency),
        ]
    )


def trip_option_key(pkg: dict) -> tuple:
    """Стабильный ключ результата для upsert/дедупликации."""
    flight = pkg.get("flight") or {}
    hotel = pkg.get("hotel") or {}
    return (
        pkg.get("destination"),
        pkg.get("departure_date"),
        pkg.get("return_date"),
        pkg.get("passengers"),
        pkg.get("package_type"),
        flight.get("offer_id") or flight.get("airline"),
        flight.get("price_per_person"),
        hotel.get("hotel_id") or hotel.get("name"),
        pkg.get("budget_mode"),
    )


def dedupe_trip_options(packages: list[dict]) -> list[dict]:
    """Удалить идентичные пакеты, сохранив порядок."""
    seen: set[tuple] = set()
    result: list[dict] = []
    for pkg in packages:
        key = trip_option_key(pkg)
        if key in seen:
            continue
        seen.add(key)
        result.append(pkg)
    return result


def resolve_package_choice(message: str, trip_options: list[dict]) -> dict | None:
    """Распознать выбранный пользователем вариант поездки."""
    if not trip_options or not message:
        return None
    lowered = message.strip().lower()

    # 1. По словам "последний", "крайний"
    if any(w in lowered for w in ["последн", "крайн"]):
        return trip_options[-1]

    # 2. По тарифу / типу пакета (Люкс, Премиум, Комфорт, Оптимальный, Эконом)
    for pkg in trip_options:
        pkg_type = pkg.get("package_type", "").lower()
        if pkg_type and pkg_type in lowered:
            return pkg

    # 3. По названию отеля (Mercure, Radisson, Swissôtel и т.д.)
    for pkg in trip_options:
        hotel_name = pkg.get("hotel", {}).get("name", "").lower()
        hotel_stems = [w for w in re.findall(r"[a-zа-яё0-9]+", hotel_name) if len(w) >= 4]
        if any(stem in lowered for stem in hotel_stems):
            return pkg

    # 4. По порядковому номеру: "вариант 3", "номер 2", "3", "3-й"
    num_m = re.search(r"(?:вариант|номер|пакет)?\s*(\d+)", lowered)
    if num_m:
        idx = int(num_m.group(1)) - 1
        if 0 <= idx < len(trip_options):
            return trip_options[idx]

    # 5. Порядковые числительные: "первый", "второй", "третий"
    ord_words = {"перв": 0, "втор": 1, "трет": 2, "четверт": 3, "пят": 4}
    for stem, idx in ord_words.items():
        if stem in lowered:
            if 0 <= idx < len(trip_options):
                return trip_options[idx]

    return None


__all__ = [
    "DEFAULT_BUDGET_SCENARIOS",
    "MIN_REALISTIC_BUDGET_RUB",
    "PREFERENCE_QUESTION",
    "SEARCH_CRITICAL_FIELDS",
    "build_search_key",
    "dedupe_trip_options",
    "is_confirmation_message",
    "merge_user_request",
    "request_fingerprint",
    "resolve_package_choice",
    "resolve_selection",
    "resolve_selections",
    "suggest_date_ranges",
    "suggest_destinations",
    "trip_option_key",
    "validate_travel_request",
]
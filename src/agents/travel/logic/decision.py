"""
Deterministic бизнес-логика планирования поездки.

Здесь реализованы:

* :func:`merge_user_request` — слияние текущего запроса с патчем;
* :func:`validate_travel_request` — проверка готовности к агрегации;
* :func:`suggest_destinations` — генерация вариантов направлений;
* :func:`suggest_date_ranges` — генерация конкретных периодов из month+duration;
* :func:`resolve_selection` — разбор пользовательского выбора среди кандидатов.

Критические проверки (destination, dates, origin, travelers, budget)
выполняются кодом, а не LLM.
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

# Бюджетные сценарии по умолчанию (руб.), если пользователь не задал бюджет.
DEFAULT_BUDGET_SCENARIOS: dict[str, float] = {
    "economy": 100000.0,
    "optimal": 150000.0,
    "comfort": 250000.0,
}

# Маркер «пользователь подтвердил конкретный период» хранится в state
# (confirmed_date_range), а не в UserRequest.

_MONTH_NUMBER: dict[Month, int] = {
    Month.JANUARY: 1, Month.FEBRUARY: 2, Month.MARCH: 3, Month.APRIL: 4,
    Month.MAY: 5, Month.JUNE: 6, Month.JULY: 7, Month.AUGUST: 8,
    Month.SEPTEMBER: 9, Month.OCTOBER: 10, Month.NOVEMBER: 11, Month.DECEMBER: 12,
}

_SCALAR_FIELDS = [
    "origin",
    "destination",
    "destination_country",
    "duration",
    "travelers",
    "traveler_range",
    "budget",
    "budget_range",
    "currency",
    "preferred_transport",
]


def merge_user_request(
    current: UserRequest | None,
    patch: UserRequestPatch,
) -> UserRequest:
    """Объединить текущий ``UserRequest`` с патчем.

    Ранее известные значения сохраняются. Значения из патча перезаписывают
    старые (пользователь может изменить уже указанный параметр). ``None`` в
    патче НЕ стирает значение.
    """
    base = current.model_copy(deep=True) if current is not None else UserRequest()

    for field in _SCALAR_FIELDS:
        value = getattr(patch, field, None)
        if value is not None:
            setattr(base, field, value)

    if patch.exact_dates:
        base.date_preferences.exact_dates = list(patch.exact_dates)
    if patch.month:
        base.date_preferences.month = list(patch.month)
    if patch.season:
        base.date_preferences.season = list(patch.season)

    # Диапазоны также выставляют максимум в скалярные поля.
    if patch.traveler_range is not None:
        base.travelers = max(patch.traveler_range)
    if patch.budget_range is not None:
        base.budget = max(patch.budget_range)

    # Preferences/constraints/hotel_requirements — объединяем с дедупликацией.
    if patch.preferences:
        existing = {p.name for p in base.preferences}
        for pref in patch.preferences:
            if pref.name not in existing:
                base.preferences.append(pref)
                existing.add(pref.name)

    if patch.constraints:
        existing_c = {c.name for c in base.constraints}
        for con in patch.constraints:
            if con.name not in existing_c:
                base.constraints.append(con)
                existing_c.add(con.name)

    if patch.hotel_requirements:
        for req in patch.hotel_requirements:
            if req not in base.hotel_requirements:
                base.hotel_requirements.append(req)

    for field in patch.clear_fields:
        if field in _SCALAR_FIELDS:
            default = UserRequest.model_fields[field].default
            setattr(base, field, default)
        elif field == "preferences":
            base.preferences = []
        elif field == "constraints":
            base.constraints = []
        elif field == "hotel_requirements":
            base.hotel_requirements = []

    return base


def _resolved_destination(request: UserRequest, selected: bool) -> str | None:
    """Вернуть destination, если он реально выбран пользователем и есть в dataset."""
    if request.destination and ds.get_destination_by_city(request.destination):
        return request.destination
    return None


def validate_travel_request(
    request: UserRequest | None,
    *,
    destination_selected: bool = False,
    confirmed_date_range: DateRange | None = None,
    travelers_provided: bool = True,
    current_year: int = 2026,
) -> ValidationResult:
    """Deterministic-проверка готовности запроса к агрегации.

    :param request: текущий ``UserRequest``.
    :param destination_selected: True, если пользователь подтвердил город
        (выбор среди кандидатов). Если destination задан явно в тексте, он
        считается выбранным.
    :param confirmed_date_range: период, подтверждённый пользователем.
    """
    if request is None:
        return ValidationResult(
            ready=False,
            missing=["destination", "origin", "dates", "travelers", "budget"],
            questions=["Куда и откуда, на какие даты, сколько человек и какой бюджет?"],
            reason="Запрос ещё не начат.",
        )

    missing: list[str] = []
    decisions: list[str] = []

    # --- Destination ---
    known_city = None
    if request.destination:
        known_city = ds.get_destination_by_city(request.destination)
    if not known_city:
        # Города нет или он неизвестен в dataset.
        decisions.append("destination_selection")
        if request.destination and not known_city:
            missing.append("destination_unknown")
        else:
            missing.append("destination")
    elif not destination_selected:
        # Город есть, но пользователь его ещё не подтвердил.
        decisions.append("destination_selection")

    # --- Origin ---
    if not request.origin:
        missing.append("origin")

    # --- Dates ---
    exact = request.date_preferences.exact_dates
    if not exact and confirmed_date_range is None:
        # Возможен ли вывод периода из month+duration?
        if request.date_preferences.month and request.duration:
            decisions.append("date_selection")
        else:
            missing.append("dates")

    # --- Travelers ---
    # Правило: range → max (уже применён в merge), отсутствие → 1.
    # Спрашиваем только если данных нет И требуются другие уточнения
    # (чтобы не задавать вопрос о количестве людей лишний раз).
    if request.travelers < 1:
        request.travelers = 1
    if not travelers_provided and decisions:
        missing.append("travelers")

    # --- Budget ---
    budget_scenarios: list[float] = []
    if request.budget is None and request.budget_range is None:
        budget_scenarios = list(DEFAULT_BUDGET_SCENARIOS.values())

    questions = _build_questions(missing, decisions, request)

    ready = (
        known_city is not None
        and destination_selected
        and not [m for m in missing if m in {"destination", "destination_unknown", "origin", "dates"}]
        and not decisions
        and request.travelers >= 1
    )

    reason = "Запрос готов к агрегации." if ready else "Требуются уточнения."
    return ValidationResult(
        ready=ready,
        missing=missing,
        decisions_required=decisions,
        questions=questions,
        budget_scenarios=budget_scenarios,
        reason=reason,
    )


def _build_questions(
    missing: list[str],
    decisions: list[str],
    request: UserRequest,
) -> list[str]:
    questions: list[str] = []
    if "destination" in missing or "destination_unknown" in missing:
        questions.append("В какой город или страну планируете поездку?")
    if "destination_selection" in decisions:
        questions.append("Какой из предложенных городов выбираем?")
    if "origin" in missing:
        questions.append("Из какого города вылетаете?")
    if "dates" in missing:
        questions.append("На какие даты планируете поездку?")
    if "date_selection" in decisions:
        questions.append("Какой из предложенных периодов подходит?")
    if "travelers" in missing:
        questions.append("Сколько человек поедет?")
    if request.budget is None and request.budget_range is None and "destination" not in missing:
        questions.append("Какой ориентировочный бюджет поездки?")
    return questions


def suggest_destinations(
    request: UserRequest | None,
    *,
    country: str | None = None,
    limit: int = 3,
) -> list[DestinationCandidate]:
    """Сгенерировать подходящие направления из mock dataset.

    Логика:

    * если задана country — города только из этой страны;
    * иначе — ранжирование всех городов по совпадению vibes/preferences,
      сезону/месяцу и ограничениям;
    * если сигналов нет — контрастный набор (разные price_level + vibes).
    """
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

    scored: list[tuple[float, ds.Destination]] = []
    for dest in pool:
        score = 0.0
        for pref in prefs:
            if pref in dest.vibes:
                score += 2.0
        # Сезон.
        if season and season in dest.seasons:
            score += 1.0
        if month and season is None:
            guessed = _guess_season(month)
            if guessed in dest.seasons:
                score += 1.0
        # Предпочтение тёплой погоды / моря.
        if "warm_weather" in prefs and "beach" in dest.vibes:
            score += 1.0
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
            reason=_reason_for(d, prefs),
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


def _reason_for(dest: ds.Destination, prefs: set[str]) -> str:
    matched = [v for v in dest.vibes if v in prefs]
    if matched:
        return "подходит под: " + ", ".join(matched)
    return "разнообразит выбор"


def _contrastive_selection(pool: list, limit: int) -> list:
    """Выбрать контрастные города (разные price_level и основные vibes)."""
    by_price: dict[str, list] = {}
    for d in pool:
        by_price.setdefault(d.price_level.value, []).append(d)
    chosen = []
    # Первый город каждого ценового уровня.
    for level in ["budget", "medium", "premium"]:
        if by_price.get(level):
            chosen.append(by_price[level][0])
        if len(chosen) >= limit:
            break
    # Добираем оставшиеся по цене medium.
    for d in pool:
        if len(chosen) >= limit:
            break
        if d not in chosen:
            chosen.append(d)
    return chosen[:limit]


def suggest_date_ranges(
    request: UserRequest,
    *,
    count: int = 3,
    year: int | None = None,
) -> list[DateRange]:
    """Сгенерировать конкретные периоды из month + duration.

    Возвращает 2–3 непересекающихся периода внутри указанного месяца.
    Не запускает поиск билетов.
    """
    if not request.date_preferences.month or not request.duration:
        return []

    month = request.date_preferences.month[0]
    month_num = _MONTH_NUMBER[month]
    duration = max(1, request.duration)
    yr = year or 2026

    days_in_month = calendar.monthrange(yr, month_num)[1]
    # Стартовые дни: 5, 12, 19 (но не выходим за месяц).
    starts = [5, 12, 19, 26]
    ranges: list[DateRange] = []
    for start_day in starts:
        end_day = start_day + duration
        if start_day > days_in_month:
            continue
        # Переносим конец в следующий месяц при необходимости.
        if end_day <= days_in_month:
            ranges.append(
                DateRange(
                    start_date=date(yr, month_num, start_day),
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
                    start_date=date(yr, month_num, start_day),
                    end_date=date(nxt_year, next_month, overflow),
                )
            )
        if len(ranges) >= count:
            break
    return ranges


def resolve_selection(
    message: str,
    candidates: list[DestinationCandidate],
    date_ranges: list[DateRange] | None = None,
) -> SelectionResult:
    """Разобрать ответ пользователя на предложенные варианты.

    Поддерживает:

    * порядковый номер («первый», «1», «вариант 2»);
    * явное название города («Флоренция», «Rome»);
    * отказ + новый город («ни один, хочу Венецию»).
    """
    text = (message or "").strip()
    lowered = text.lower()

    # 1. Порядковые номера среди кандидатов.
    if candidates:
        ordinal_map = {
            "перв": 0, "1": 0, "один": 0,
            "втор": 1, "2": 1, "два": 1,
            "трет": 2, "3": 2, "три": 2,
        }
        for token, idx in ordinal_map.items():
            if idx < len(candidates) and re.search(rf"\b{token}", lowered):
                # Не путать "три" с количеством людей, если явно назван город.
                if _mentions_city(text):
                    break
                return SelectionResult(
                    kind="destination",
                    index=idx,
                    city=candidates[idx].city,
                    raw=text,
                )

    # 2. Явное название города.
    city = ds.resolve_city(text)
    if city:
        # Город должен быть в dataset (resolve_city уже это гарантирует).
        if city in [d for d in ds.DESTINATIONS] or ds.get_destination_by_city(city.city):
            return SelectionResult(kind="destination", city=city.city, raw=text)

    # 3. Выбор периода среди предложенных дат.
    if date_ranges:
        ordinal_tokens = ["перв", "втор", "трет", "четверт", "пят"]
        for idx, rng in enumerate(date_ranges):
            matched = False
            if idx < len(ordinal_tokens) and ordinal_tokens[idx] in lowered:
                matched = True
            elif re.search(rf"\b{idx + 1}\b", lowered):
                matched = True
            if matched:
                return SelectionResult(kind="date", index=idx, date_range=rng, raw=text)
        # Явные даты в ответе.
        from agents.travel.logic.extraction import _extract_dates

        exact = _extract_dates(text, 2026)
        if exact and len(exact) >= 2:
            return SelectionResult(
                kind="date",
                date_range=DateRange(start_date=exact[0], end_date=exact[1]),
                raw=text,
            )

    return SelectionResult(kind="unknown", raw=text)


def _mentions_city(text: str) -> bool:
    return ds.resolve_city(text) is not None


__all__ = [
    "DEFAULT_BUDGET_SCENARIOS",
    "merge_user_request",
    "resolve_selection",
    "suggest_date_ranges",
    "suggest_destinations",
    "validate_travel_request",
]

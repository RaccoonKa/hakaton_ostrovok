"""
Провайдер поиска авиабилетов с поддержкой PostgreSQL и fallback на data/flights.json.
"""

import json
import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

from domain.common import Currency
from domain.flight import Flight
from memory.db_storage import fetch_payloads, get_data_dir, is_db_available

logger = logging.getLogger(__name__)

TZ_MSK = timezone(timedelta(hours=3))

CITY_ALIASES: dict[str, str] = {
    "moscow": "москва",
    "mow": "москва",
    "sochi": "сочи",
    "адлер": "сочи",
    "adler": "сочи",
    "saint petersburg": "санкт-петербург",
    "st. petersburg": "санкт-петербург",
    "st petersburg": "санкт-петербург",
    "spb": "санкт-петербург",
    "спб": "санкт-петербург",
    "питер": "санкт-петербург",
    "петербург": "санкт-петербург",
    "kaliningrad": "калининград",
    "кёнигсберг": "калининград",
    "кенигсберг": "калининград",
    "храброво": "калининград",
    "istanbul": "стамбул",
    "antalya": "анталья",
}


def _parse_date(d_val: date | datetime | str) -> date:
    """Безопасный парсинг даты из date, datetime или ISO-строки."""
    if isinstance(d_val, datetime):
        return d_val.date()
    if isinstance(d_val, date):
        return d_val
    s = d_val.strip()
    if "T" in s or " " in s:
        return datetime.fromisoformat(s).date()
    return date.fromisoformat(s)


def _parse_iso_duration(duration_str: str | None) -> timedelta | None:
    """Парсит ISO duration формат вида PT3H55M в timedelta."""
    if not duration_str:
        return None
    cleaned = duration_str.strip().upper()
    match = re.match(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$", cleaned)
    if not match or (
        match.group(1) is None
        and match.group(2) is None
        and match.group(3) is None
    ):
        return None
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return timedelta(hours=hours, minutes=minutes, seconds=seconds)


def _load_raw_flights(origin: str, destination: str) -> list[dict[str, Any]]:
    """
    Загружает сырые записи рейсов:
    сначала пробует PostgreSQL, при недоступности читает data/flights.json.
    """
    if is_db_available():
        query = """
        SELECT payload FROM flights
        WHERE (origin ILIKE %s OR payload->>'origin_city' ILIKE %s OR payload->>'origin_code' ILIKE %s)
          AND (destination ILIKE %s OR payload->>'destination_city' ILIKE %s OR payload->>'destination_code' ILIKE %s)
        """
        o_pattern = f"%{origin.strip()}%"
        d_pattern = f"%{destination.strip()}%"
        payloads = fetch_payloads(
            query, (o_pattern, o_pattern, o_pattern, d_pattern, d_pattern, d_pattern)
        )
        if payloads is not None:
            return payloads

    # Fallback на локальный JSON
    data_dir = get_data_dir()
    flights_file = data_dir / "flights.json"
    if not flights_file.exists():
        logger.warning("Flights data file %s not found.", flights_file)
        return []

    with open(flights_file, encoding="utf-8") as f:
        flights: list[dict[str, Any]] = json.load(f)

    return flights


def _match_point(
    query: str, point_full: str, point_city: str, point_code: str
) -> bool:
    """Сопоставляет точку маршрута с учетом кода аэропорта и синонимов города."""
    q = query.strip().lower()
    full = point_full.lower()
    city = point_city.lower()
    code = point_code.lower()

    if q in full or full in q or q == city or q == code:
        return True

    norm_q = CITY_ALIASES.get(q)
    if norm_q and (norm_q in full or norm_q == city or norm_q in city):
        return True

    return False


def _match_route(f: dict[str, Any], origin: str, destination: str) -> bool:
    """Проверяет совпадение города или кода аэропорта в маршруте."""
    f_orig = f.get("origin", "")
    f_orig_city = f.get("origin_city", "")
    f_orig_code = f.get("origin_code", "")

    f_dest = f.get("destination", "")
    f_dest_city = f.get("destination_city", "")
    f_dest_code = f.get("destination_code", "")

    return _match_point(origin, f_orig, f_orig_city, f_orig_code) and _match_point(
        destination, f_dest, f_dest_city, f_dest_code
    )


def _build_flight_leg(
    f: dict[str, Any],
    dep_date: date,
    travelers: int,
    max_price: float | None,
) -> Flight | None:
    """Формирует объект Flight с подстановкой даты и расчётом стоимости."""
    travelers = max(1, travelers)
    price_per_person = float(f.get("price", 0.0))
    total_price = round(price_per_person * travelers, 2)

    if max_price is not None and total_price > max_price:
        return None

    dep_time_str = f.get("departure_time", "12:00")
    dep_h, dep_m = map(int, dep_time_str.split(":"))
    dep_dt = datetime(
        dep_date.year, dep_date.month, dep_date.day, dep_h, dep_m, tzinfo=TZ_MSK
    )

    duration = _parse_iso_duration(f.get("duration"))
    if duration:
        arr_dt = dep_dt + duration
    else:
        arr_time_str = f.get("arrival_time", "15:00")
        arr_h, arr_m = map(int, arr_time_str.split(":"))
        arr_date = dep_date if (arr_h, arr_m) >= (dep_h, dep_m) else dep_date + timedelta(days=1)
        arr_dt = datetime(
            arr_date.year, arr_date.month, arr_date.day, arr_h, arr_m, tzinfo=TZ_MSK
        )
        duration = arr_dt - dep_dt

    return Flight(
        origin=f["origin"],
        destination=f["destination"],
        departure_at=dep_dt,
        arrival_at=arr_dt,
        duration=duration,
        carrier=f.get("carrier"),
        flight_number=f.get("flight_number"),
        stops=int(f.get("stops", 0)),
        baggage=f.get("baggage"),
        price=total_price,
        currency=Currency(f["currency"]) if f.get("currency") else Currency.RUB,
        refundable=f.get("refundable"),
        changeable=f.get("changeable"),
    )


def search_flights(
    origin: str,
    destination: str,
    departure_date: date | str,
    return_date: date | str | None = None,
    travelers: int = 1,
    max_price: float | None = None,
) -> list[Flight]:
    """
    Поиск авиабилетов по маршруту, дате отправления и возврата с расчётом цены.
    """
    dep_date = _parse_date(departure_date)
    travelers = max(1, travelers)

    raw_flights = _load_raw_flights(origin, destination)
    result: list[Flight] = []

    # 1. Поиск прямого направления (outbound)
    for f in raw_flights:
        if _match_route(f, origin, destination):
            flight_obj = _build_flight_leg(f, dep_date, travelers, max_price)
            if flight_obj is not None:
                result.append(flight_obj)

    # 2. Поиск обратного направления (return leg) если запрошен return_date
    if return_date is not None:
        ret_date = _parse_date(return_date)
        ret_raw_flights = _load_raw_flights(destination, origin)
        for f in ret_raw_flights:
            if _match_route(f, destination, origin):
                ret_flight = _build_flight_leg(f, ret_date, travelers, max_price)
                if ret_flight is not None:
                    result.append(ret_flight)

    return result

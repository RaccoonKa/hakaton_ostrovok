"""
Провайдер поиска поездов с поддержкой PostgreSQL и fallback на data/trains.json.
"""

import json
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from domain.common import Currency, TransportType
from domain.transport import Transport
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


def _load_raw_trains(origin: str, destination: str) -> list[dict[str, Any]]:
    """
    Загружает сырые записи поездов:
    сначала пробует PostgreSQL, при недоступности читает data/trains.json.
    """
    if is_db_available():
        query = """
        SELECT payload FROM trains
        WHERE (origin ILIKE %s OR payload->>'origin_city' ILIKE %s)
          AND (destination ILIKE %s OR payload->>'destination_city' ILIKE %s)
        """
        o_pattern = f"%{origin.strip()}%"
        d_pattern = f"%{destination.strip()}%"
        payloads = fetch_payloads(query, (o_pattern, o_pattern, d_pattern, d_pattern))
        if payloads is not None:
            return payloads

    # Fallback на локальный JSON
    data_dir = get_data_dir()
    trains_file = data_dir / "trains.json"
    if not trains_file.exists():
        logger.warning("Trains data file %s not found.", trains_file)
        return []

    with open(trains_file, encoding="utf-8") as f:
        trains: list[dict[str, Any]] = json.load(f)

    return trains


def _match_train_point(query: str, point_full: str, point_city: str) -> bool:
    """Сопоставляет вокзал или город отправления/прибытия с учетом синонимов."""
    q = query.strip().lower()
    full = point_full.lower()
    city = point_city.lower()

    if q in full or full in q or q == city or city in q:
        return True

    norm_q = CITY_ALIASES.get(q)
    if norm_q and (norm_q in full or norm_q == city or norm_q in city):
        return True

    return False


def _match_train_route(t: dict[str, Any], origin: str, destination: str) -> bool:
    """Проверяет соответствие маршрута поезда городам или вокзалам."""
    t_orig = t.get("origin", "")
    t_orig_city = t.get("origin_city", "")

    t_dest = t.get("destination", "")
    t_dest_city = t.get("destination_city", "")

    return _match_train_point(origin, t_orig, t_orig_city) and _match_train_point(
        destination, t_dest, t_dest_city
    )


def search_trains(
    origin: str,
    destination: str,
    departure_date: date | str,
    travelers: int = 1,
) -> list[Transport]:
    """
    Поиск поездов по направлению и дате с подстановкой времени и расчётом стоимости.
    """
    dep_date = _parse_date(departure_date)
    travelers = max(1, travelers)

    raw_trains = _load_raw_trains(origin, destination)
    result: list[Transport] = []

    for t in raw_trains:
        if not _match_train_route(t, origin, destination):
            continue

        dep_time_str = t.get("departure_time", "12:00")
        dep_h, dep_m = map(int, dep_time_str.split(":"))
        dep_dt = datetime(
            dep_date.year, dep_date.month, dep_date.day, dep_h, dep_m, tzinfo=TZ_MSK
        )

        arr_time_str = t.get("arrival_time", "18:00")
        arr_h, arr_m = map(int, arr_time_str.split(":"))

        day_offset = int(t.get("day_offset", 0))
        if day_offset == 0 and (arr_h, arr_m) < (dep_h, dep_m):
            day_offset = 1

        arr_date = dep_date + timedelta(days=day_offset)
        arr_dt = datetime(
            arr_date.year, arr_date.month, arr_date.day, arr_h, arr_m, tzinfo=TZ_MSK
        )

        duration_minutes = t.get("duration_minutes")
        duration = (
            timedelta(minutes=int(duration_minutes))
            if duration_minutes
            else (arr_dt - dep_dt)
        )

        total_price = round(float(t.get("price", 0.0)) * travelers, 2)
        conditions = (
            t.get("conditions")
            or f"Поезд {t.get('train_number', '')} {t.get('train_name', '')}".strip()
        )

        transport_obj = Transport(
            origin=t["origin"],
            destination=t["destination"],
            departure_at=dep_dt,
            arrival_at=arr_dt,
            duration=duration,
            transport_type=TransportType.TRAIN,
            carrier=t.get("carrier"),
            price=total_price,
            currency=Currency(t["currency"]) if t.get("currency") else Currency.RUB,
            conditions=conditions,
        )
        result.append(transport_obj)

    return result

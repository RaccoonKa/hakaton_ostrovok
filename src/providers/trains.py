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
    # Москва и вокзалы
    "moscow": "москва",
    "mow": "москва",
    "мск": "москва",
    "казанский": "москва",
    "казанский вокзал": "москва",
    "ленинградский": "москва",
    "ленинградский вокзал": "москва",
    "белорусский": "москва",
    "белорусский вокзал": "москва",
    "ярославский": "москва",
    "ярославский вокзал": "москва",
    "восточный": "москва",
    "восточный вокзал": "москва",
    # Сочи
    "sochi": "сочи",
    "адлер": "сочи",
    "adler": "сочи",
    "aer": "сочи",
    # Санкт-Петербург
    "saint petersburg": "санкт-петербург",
    "st. petersburg": "санкт-петербург",
    "st petersburg": "санкт-петербург",
    "spb": "санкт-петербург",
    "спб": "санкт-петербург",
    "питер": "санкт-петербург",
    "петербург": "санкт-петербург",
    "московский вокзал": "санкт-петербург",
    "витебский вокзал": "санкт-петербург",
    # Казань
    "казань": "казань",
    "kazan": "казань",
    "kzn": "казань",
    "казань-пассажирская": "казань",
    # Нижний Новгород
    "нижний новгород": "нижний новгород",
    "нижний": "нижний новгород",
    "нн": "нижний новгород",
    "nizhny novgorod": "нижний новгород",
    "nizhny": "нижний новгород",
    # Екатеринбург
    "екатеринбург": "екатеринбург",
    "екб": "екатеринбург",
    "ekaterinburg": "екатеринбург",
    "yekaterinburg": "екатеринбург",
    "екатеринбург-пассажирский": "екатеринбург",
    # Калининград
    "калининград": "калининград",
    "kaliningrad": "калининград",
    "кёнигсберг": "калининград",
    "кенигсберг": "калининград",
    "южный вокзал": "калининград",
}

KOMSOL_STATIONS = {"MOW_KAZ", "MOW_LEN", "MOW_YAR"}


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


def _build_train_leg(
    t: dict[str, Any],
    dep_date: date,
    travelers: int,
    max_price: float | None = None,
) -> Transport | None:
    """Формирует объект Transport из сырой записи поезда."""
    travelers = max(1, travelers)
    price_per_person = float(t.get("price", 0.0))
    total_price = round(price_per_person * travelers, 2)

    if max_price is not None and total_price > max_price:
        return None

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

    conditions = (
        t.get("conditions")
        or f"Поезд {t.get('train_number', '')} {t.get('train_name', '')}".strip()
    )

    return Transport(
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
        stops=int(t.get("stops", 0)),
        transit_point=t.get("transit_point"),
        layover_duration=None,
    )


def _synthesize_train_connections(
    origin: str,
    destination: str,
    dep_date: date,
    travelers: int,
    max_price: float | None = None,
    hubs: list[str] | None = None,
) -> list[Transport]:
    """
    Синтезирует пересадку 'Поезд -> Поезд' через московский ж/д узел
    с валидацией времени на смену вокзала.
    """
    if hubs is None:
        hubs = ["Москва"]

    synthesized: list[Transport] = []
    seen_combos: set[tuple[str, str]] = set()

    for hub in hubs:
        if _match_train_point(origin, hub, hub) or _match_train_point(destination, hub, hub):
            continue

        raw_leg1 = _load_raw_trains(origin, hub)
        raw_leg2 = _load_raw_trains(hub, destination)

        leg1_candidates = [
            t for t in raw_leg1
            if int(t.get("stops", 0)) == 0 and _match_train_route(t, origin, hub)
        ]
        leg2_candidates = [
            t for t in raw_leg2
            if int(t.get("stops", 0)) == 0 and _match_train_route(t, hub, destination)
        ]

        for t1 in leg1_candidates:
            t1_obj = _build_train_leg(t1, dep_date, 1, None)
            if t1_obj is None:
                continue

            for t2 in leg2_candidates:
                t2_dep_date = t1_obj.arrival_at.date()
                t2_obj = _build_train_leg(t2, t2_dep_date, 1, None)
                if t2_obj is None:
                    continue

                if t2_obj.departure_at < t1_obj.arrival_at:
                    t2_obj = _build_train_leg(t2, t2_dep_date + timedelta(days=1), 1, None)
                    if t2_obj is None:
                        continue

                layover = t2_obj.departure_at - t1_obj.arrival_at
                st1_dest = t1.get("station_dest_code", "")
                st2_orig = t2.get("station_origin_code", "")

                same_plaza = (st1_dest in KOMSOL_STATIONS and st2_orig in KOMSOL_STATIONS) or (st1_dest == st2_orig and bool(st1_dest))
                min_layover = timedelta(minutes=30) if same_plaza else timedelta(hours=1, minutes=30)
                max_layover = timedelta(hours=10)

                if min_layover <= layover <= max_layover:
                    combo_key = (str(t1.get("train_number")), str(t2.get("train_number")))
                    if combo_key in seen_combos:
                        continue
                    seen_combos.add(combo_key)

                    total_price_pp = float(t1.get("price", 0.0)) + float(t2.get("price", 0.0))
                    total_price = round(total_price_pp * travelers, 2)
                    if max_price is not None and total_price > max_price:
                        continue

                    carrier1 = t1.get("carrier")
                    carrier2 = t2.get("carrier")
                    carrier = carrier1 if carrier1 == carrier2 else f"{carrier1} / {carrier2}"

                    s1 = t1.get("destination", "").replace("Москва (", "").replace(")", "").strip()
                    s2 = t2.get("origin", "").replace("Москва (", "").replace(")", "").strip()
                    if same_plaza:
                        if st1_dest == st2_orig:
                            transit_pt = f"Москва ({s1})"
                        else:
                            transit_pt = f"Москва (Площадь трех вокзалов: {s1} ➔ {s2})"
                    else:
                        transit_pt = f"Москва (Метро: {s1} ➔ {s2})"

                    conditions = (
                        f"Стыковочный ж/д маршрут: Поезд {t1.get('train_number')} ({t1.get('train_name', '')}) ➔ "
                        f"Поезд {t2.get('train_number')} ({t2.get('train_name', '')}). "
                        f"Пересадка: {transit_pt} ({int(layover.total_seconds() // 60)} мин)."
                    )

                    composite_train = Transport(
                        origin=t1["origin"],
                        destination=t2["destination"],
                        departure_at=t1_obj.departure_at,
                        arrival_at=t2_obj.arrival_at,
                        duration=t2_obj.arrival_at - t1_obj.departure_at,
                        transport_type=TransportType.TRAIN,
                        carrier=carrier,
                        price=total_price,
                        currency=Currency.RUB,
                        conditions=conditions,
                        stops=1,
                        transit_point=transit_pt,
                        layover_duration=layover,
                    )
                    synthesized.append(composite_train)

    return synthesized


def search_trains(
    origin: str,
    destination: str,
    departure_date: date | str,
    return_date: date | str | None = None,
    travelers: int = 1,
    max_price: float | None = None,
    max_stops: int | None = None,
) -> list[Transport]:
    """
    Поиск поездов по направлению, дате отправления и возврата с расчётом цены и стыковок.
    """
    dep_date = _parse_date(departure_date)
    travelers = max(1, travelers)

    raw_trains = _load_raw_trains(origin, destination)
    result: list[Transport] = []

    # 1. Поиск прямого направления
    for t in raw_trains:
        if _match_train_route(t, origin, destination):
            train_obj = _build_train_leg(t, dep_date, travelers, max_price)
            if train_obj is not None:
                result.append(train_obj)

    # 1.1. Синтез пересадок 'Поезд -> Поезд' через Москву если прямых рейсов мало
    if (max_stops is None or max_stops >= 1) and len(result) < 2:
        synthesized_out = _synthesize_train_connections(
            origin, destination, dep_date, travelers, max_price
        )
        existing_keys = {(t.origin, t.destination, t.departure_at) for t in result}
        for s_t in synthesized_out:
            key = (s_t.origin, s_t.destination, s_t.departure_at)
            if key not in existing_keys:
                result.append(s_t)
                existing_keys.add(key)

    # 2. Обратное направление если передан return_date
    if return_date is not None:
        ret_date = _parse_date(return_date)
        ret_raw_trains = _load_raw_trains(destination, origin)
        ret_result: list[Transport] = []
        for t in ret_raw_trains:
            if _match_train_route(t, destination, origin):
                ret_train = _build_train_leg(t, ret_date, travelers, max_price)
                if ret_train is not None:
                    ret_result.append(ret_train)

        if (max_stops is None or max_stops >= 1) and len(ret_result) < 2:
            synthesized_ret = _synthesize_train_connections(
                destination, origin, ret_date, travelers, max_price
            )
            existing_keys = {(t.origin, t.destination, t.departure_at) for t in ret_result}
            for s_t in synthesized_ret:
                key = (s_t.origin, s_t.destination, s_t.departure_at)
                if key not in existing_keys:
                    ret_result.append(s_t)
                    existing_keys.add(key)

        result.extend(ret_result)

    if max_stops is not None:
        result = [t for t in result if t.stops <= max_stops]

    return result

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
    # Москва (город и синонимы, без смешивания конкретных аэропортов SVO/DME/VKO)
    "moscow": "москва",
    "mow": "москва",
    "мск": "москва",
    # Сочи
    "sochi": "сочи",
    "адлер": "сочи",
    "adler": "сочи",
    # Санкт-Петербург
    "saint petersburg": "санкт-петербург",
    "st. petersburg": "санкт-петербург",
    "st petersburg": "санкт-петербург",
    "spb": "санкт-петербург",
    "спб": "санкт-петербург",
    "питер": "санкт-петербург",
    "петербург": "санкт-петербург",
    "пулково": "санкт-петербург",
    "pulkovo": "санкт-петербург",
    # Калининград
    "kaliningrad": "калининград",
    "кёнигсберг": "калининград",
    "кенигсберг": "калининград",
    "храброво": "калининград",
    "khrabrovo": "калининград",
    # Екатеринбург
    "екатеринбург": "екатеринбург",
    "екб": "екатеринбург",
    "ekaterinburg": "екатеринбург",
    "yekaterinburg": "екатеринбург",
    "кольцово": "екатеринбург",
    "koltsovo": "екатеринбург",
    # Казань
    "казань": "казань",
    "kazan": "казань",
    # Новосибирск
    "новосибирск": "новосибирск",
    "новосиб": "новосибирск",
    "novosibirsk": "новосибирск",
    "толмачево": "новосибирск",
    "толмачёво": "новосибирск",
    "tolmachevo": "новосибирск",
    # Международные
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

    layover = _parse_iso_duration(f.get("layover_duration"))

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
        transit_point=f.get("transit_point"),
        layover_duration=layover,
    )


def _synthesize_transit_connections(
    origin: str,
    destination: str,
    dep_date: date,
    travelers: int,
    max_price: float | None,
    hubs: list[str] | None = None,
) -> list[Flight]:
    """
    Синтезирует 2-плечевые транзитные маршруты (Origin -> Hub -> Destination)
    через московские и петербургские авиахабы.
    """
    if hubs is None:
        hubs = ["Москва", "Санкт-Петербург"]

    synthesized: list[Flight] = []
    seen_combos: set[tuple[str, str]] = set()

    for hub in hubs:
        if _match_point(origin, hub, hub, "") or _match_point(destination, hub, hub, ""):
            continue

        raw_leg1 = _load_raw_flights(origin, hub)
        raw_leg2 = _load_raw_flights(hub, destination)

        leg1_candidates = [
            f for f in raw_leg1
            if int(f.get("stops", 0)) == 0 and _match_route(f, origin, hub)
        ]
        leg2_candidates = [
            f for f in raw_leg2
            if int(f.get("stops", 0)) == 0 and _match_route(f, hub, destination)
        ]

        for f1 in leg1_candidates:
            f1_obj = _build_flight_leg(f1, dep_date, 1, None)
            if f1_obj is None:
                continue

            for f2 in leg2_candidates:
                f2_dep_date = f1_obj.arrival_at.date()
                f2_obj = _build_flight_leg(f2, f2_dep_date, 1, None)
                if f2_obj is None:
                    continue

                if f2_obj.departure_at < f1_obj.arrival_at:
                    f2_obj = _build_flight_leg(f2, f2_dep_date + timedelta(days=1), 1, None)
                    if f2_obj is None:
                        continue

                layover = f2_obj.departure_at - f1_obj.arrival_at
                f1_dest_code = str(f1.get("destination_code", ""))
                f2_orig_code = str(f2.get("origin_code", ""))

                same_airport = (f1_dest_code == f2_orig_code) and bool(f1_dest_code)
                min_layover = timedelta(minutes=50) if same_airport else timedelta(hours=3, minutes=30)
                max_layover = timedelta(hours=8)

                if min_layover <= layover <= max_layover:
                    combo_key = (str(f1.get("flight_number")), str(f2.get("flight_number")))
                    if combo_key in seen_combos:
                        continue
                    seen_combos.add(combo_key)

                    total_price_pp = float(f1.get("price", 0.0)) + float(f2.get("price", 0.0))
                    total_price = round(total_price_pp * travelers, 2)
                    if max_price is not None and total_price > max_price:
                        continue

                    carrier1 = f1.get("carrier")
                    carrier2 = f2.get("carrier")
                    carrier = carrier1 if carrier1 == carrier2 else f"{carrier1} / {carrier2}"
                    transit_pt = f"{hub} ({f1_dest_code})" if f1_dest_code else hub

                    composite_flight = Flight(
                        origin=f1["origin"],
                        destination=f2["destination"],
                        departure_at=f1_obj.departure_at,
                        arrival_at=f2_obj.arrival_at,
                        duration=f2_obj.arrival_at - f1_obj.departure_at,
                        carrier=carrier,
                        flight_number=f"{f1['flight_number']} / {f2['flight_number']}",
                        stops=1,
                        baggage=f1.get("baggage"),
                        price=total_price,
                        currency=Currency.RUB,
                        refundable=bool(f1.get("refundable")) and bool(f2.get("refundable")),
                        changeable=bool(f1.get("changeable")) and bool(f2.get("changeable")),
                        transit_point=transit_pt,
                        layover_duration=layover,
                    )
                    synthesized.append(composite_flight)

    return synthesized


def search_flights(
    origin: str,
    destination: str,
    departure_date: date | str,
    return_date: date | str | None = None,
    travelers: int = 1,
    max_price: float | None = None,
    max_stops: int | None = None,
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

    # 1.1. Синтез пересадок через хабы если рейсов меньше 3
    if (max_stops is None or max_stops >= 1) and len(result) < 3:
        synthesized_out = _synthesize_transit_connections(
            origin, destination, dep_date, travelers, max_price
        )
        existing_numbers = {f.flight_number for f in result}
        for s_f in synthesized_out:
            if s_f.flight_number not in existing_numbers:
                result.append(s_f)
                existing_numbers.add(s_f.flight_number)

    # 2. Поиск обратного направления (return leg) если запрошен return_date
    if return_date is not None:
        ret_date = _parse_date(return_date)
        ret_raw_flights = _load_raw_flights(destination, origin)
        ret_result: list[Flight] = []
        for f in ret_raw_flights:
            if _match_route(f, destination, origin):
                ret_flight = _build_flight_leg(f, ret_date, travelers, max_price)
                if ret_flight is not None:
                    ret_result.append(ret_flight)

        if (max_stops is None or max_stops >= 1) and len(ret_result) < 3:
            synthesized_ret = _synthesize_transit_connections(
                destination, origin, ret_date, travelers, max_price
            )
            existing_numbers = {f.flight_number for f in ret_result}
            for s_f in synthesized_ret:
                if s_f.flight_number not in existing_numbers:
                    ret_result.append(s_f)
                    existing_numbers.add(s_f.flight_number)

        result.extend(ret_result)

    if max_stops is not None:
        result = [f for f in result if f.stops <= max_stops]

    return result

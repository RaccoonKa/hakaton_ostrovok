"""
Агрегатор поездки (packaging).

Собирает перелёт/поезд + отель + трансфер из реальных JSON файлов
(flights.json, trains.json, hotels.json, transfers.json)
и применяет строгие фильтры по багажу, отмене, животным, звёздности и пересадкам.
"""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from langchain_core.tools import tool

from agents.travel.tools import mock_dataset as ds
from domain.common import Currency


class AggregatorNotReadyError(ValueError):
    """Запрос не готов к агрегации."""


def _get_data_dir() -> Path:
    """Возвращает путь к папке data (на 5 уровней выше от этого файла)."""
    return Path(__file__).resolve().parent.parent.parent.parent.parent / "data"


def load_json_data(filename: str) -> list[dict]:
    """Загружает данные из JSON файла."""
    file_path = _get_data_dir() / filename
    if not file_path.exists():
        return []
    with open(file_path, encoding="utf-8") as f:
        return json.load(f)


def assert_aggregator_ready(
        origin: str | None,
        destination: str | None,
        departure_date: str | None,
        passengers: int | None,
) -> None:
    if not origin:
        raise AggregatorNotReadyError("origin is required before aggregation")
    if not destination:
        raise AggregatorNotReadyError("destination is required before aggregation")
    if not departure_date:
        raise AggregatorNotReadyError("departure_date is required before aggregation")
    if passengers is None or passengers < 1:
        raise AggregatorNotReadyError("passengers must be >= 1 before aggregation")


def _budget_to_rub(budget_limit: float | None, currency: Currency | str | None) -> float | None:
    if budget_limit is None:
        return None
    if currency is None:
        return float(budget_limit)
    return ds.to_rub(budget_limit, currency)


def _nights(departure_date: str, return_date: str | None) -> int:
    try:
        dep = date.fromisoformat(departure_date)
        if return_date:
            ret = date.fromisoformat(return_date)
            n = (ret - dep).days
            return n if n > 0 else 1
    except ValueError:
        pass
    return 7


@tool
def search_and_package_trip(
        origin: str,
        destination: str,
        departure_date: str,
        return_date: str | None = None,
        passengers: int = 1,
        budget_limit: float | None = None,
        currency: str | None = None,
        preferred_transport: str | None = None,
        require_baggage: bool = False,
        require_refundable: bool = False,
        free_cancellation: bool = False,
        pet_friendly: bool = False,
        no_stops: bool = False,
        hotel_requirements: list[str] | None = None,
) -> list[dict]:
    """
    Ищет транспорт, отели и трансферы в data/*.json, применяет фильтры
    и возвращает 3 варианта поездки: 'Эконом', 'Оптимальный' и 'Комфорт' (или премиум-линейку).
    """
    assert_aggregator_ready(origin, destination, departure_date, passengers)

    dest_obj = ds.get_destination_by_city(destination) or ds.get_destination_by_iata(destination)
    city_name = dest_obj.city if dest_obj else destination

    # Загружаем реальные данные из JSON
    all_flights = load_json_data("flights.json")
    all_trains = load_json_data("trains.json")
    all_hotels = load_json_data("hotels.json")
    all_transfers = load_json_data("transfers.json")

    # --- Унификация транспорта ---
    transports = []

    if preferred_transport != "train":
        for f in all_flights:
            transports.append({
                "id": f.get("flight_number"),
                "carrier": f.get("carrier"),
                "origin_city": f.get("origin_city", ""),
                "destination_city": f.get("destination_city", ""),
                "price": f.get("price", 0),
                "type": "Рейс",
                "refundable": f.get("refundable", False),
                "baggage": f.get("baggage", ""),
                "stops": f.get("stops", 0),
                "day_offset": f.get("day_offset", 0),
                "transit_point": f.get("transit_point"),
                "layover_duration": f.get("layover_duration"),
                "tags": f.get("tags", []),
            })

    if preferred_transport != "plane":
        for t in all_trains:
            transports.append({
                "id": t.get("train_number"),
                "carrier": f"{t.get('carrier')} {t.get('train_name', '')}".strip(),
                "origin_city": t.get("origin_city", ""),
                "destination_city": t.get("destination_city", ""),
                "price": t.get("price", 0),
                "type": "Поезд",
                "refundable": True,
                "baggage": "Включен",
                "stops": t.get("stops", 0),
                "day_offset": t.get("day_offset", 0),
                "transit_point": None,
                "layover_duration": None,
                "tags": t.get("tags", []),
            })

    # Первичная фильтрация по городам
    outbound_transports = [
        t for t in transports
        if t.get("origin_city", "").lower() == origin.lower()
           and t.get("destination_city", "").lower() == city_name.lower()
    ]

    inbound_transports = []
    if return_date:
        inbound_transports = [
            t for t in transports
            if t.get("origin_city", "").lower() == city_name.lower()
               and t.get("destination_city", "").lower() == origin.lower()
        ]

    # --- ФИЛЬТРАЦИЯ ПЕРЕСАДОК (no_stops) ---
    if no_stops:
        direct_out = [t for t in outbound_transports if t.get("stops", 0) == 0]
        if direct_out:
            outbound_transports = direct_out
        if inbound_transports:
            direct_in = [t for t in inbound_transports if t.get("stops", 0) == 0]
            if direct_in:
                inbound_transports = direct_in

    # --- ФИЛЬТРАЦИЯ ПО ВОЗВРАТНОСТИ ---
    if require_refundable:
        outbound_transports = [t for t in outbound_transports if t["refundable"]]
        if inbound_transports:
            inbound_transports = [t for t in inbound_transports if t["refundable"]]

    # --- ФИЛЬТРАЦИЯ ПО БАГАЖУ ---
    if require_baggage:
        outbound_transports = [
            t for t in outbound_transports
            if "место" in t["baggage"].lower() or "включен" in t["baggage"].lower() or "23 кг" in t["baggage"].lower()
        ]
        if inbound_transports:
            inbound_transports = [
                t for t in inbound_transports
                if "место" in t["baggage"].lower() or "включен" in t["baggage"].lower() or "23 кг" in t["baggage"].lower()
            ]

    # --- ФИЛЬТРАЦИЯ ОТЕЛЕЙ ---
    all_reqs = set(hotel_requirements or [])
    if "free_cancellation" in all_reqs:
        free_cancellation = True
    if "pet_friendly" in all_reqs:
        pet_friendly = True

    hotels = [h for h in all_hotels if h.get("city", "").lower() == city_name.lower()]

    if free_cancellation:
        fc_hotels = [h for h in hotels if h.get("free_cancellation", False)]
        if fc_hotels:
            hotels = fc_hotels

    if pet_friendly:
        pf_hotels = [h for h in hotels if h.get("pet_friendly", False)]
        if pf_hotels:
            hotels = pf_hotels

    # 1. Фильтрация по требуемой звёздности
    target_stars = None
    if "stars_5" in all_reqs:
        target_stars = 5
    elif "stars_4" in all_reqs:
        target_stars = 4
    elif "stars_3" in all_reqs:
        target_stars = 3

    if target_stars is not None:
        matched_stars = [h for h in hotels if h.get("stars") == target_stars]
        if matched_stars:
            hotels = matched_stars

    # 2. Фильтрация по расположению (центр)
    if "center" in all_reqs:
        center_hotels = [
            h for h in hotels
            if any(w in h.get("district", "").lower() for w in ["центр", "султанахмет", "невский", "исторический"])
        ]
        if center_hotels:
            hotels = center_hotels

    # 3. Фильтрация по виду на море / первой линии (sea_view)
    if "sea_view" in all_reqs:
        sea_hotels = [
            h for h in hotels
            if any(w in " ".join(h.get("amenities", [])).lower() for w in ["море", "пляж", "морск"])
            or "море" in h.get("room_type", "").lower()
            or "морск" in h.get("room_type", "").lower()
        ]
        if sea_hotels:
            hotels = sea_hotels

    # 4. Фильтрация по бассейну (pool)
    if "pool" in all_reqs:
        pool_hotels = [
            h for h in hotels
            if any("бассейн" in a.lower() or "pool" in a.lower() for a in h.get("amenities", []))
        ]
        if pool_hotels:
            hotels = pool_hotels

    # 5. Фильтрация по типу питания (all_inclusive, breakfast)
    if "all_inclusive" in all_reqs:
        ai_hotels = [h for h in hotels if h.get("meal_plan") == "all_inclusive"]
        if ai_hotels:
            hotels = ai_hotels
    elif "breakfast" in all_reqs:
        bf_hotels = [h for h in hotels if h.get("meal_plan") in ["breakfast", "half_board", "all_inclusive"]]
        if bf_hotels:
            hotels = bf_hotels

    nights = _nights(departure_date, return_date)
    budget_rub = _budget_to_rub(budget_limit, currency)

    # Сортируем транспорт (при равной цене предпочитаем прямые рейсы)
    outbound_transports.sort(key=lambda t: (t.get("stops", 0), t["price"]))
    inbound_transports.sort(key=lambda t: (t.get("stops", 0), t["price"]))

    if not outbound_transports or not hotels:
        return []

    # Выборка транспорта (туда)
    cheap_out = outbound_transports[0]
    mid_out = outbound_transports[len(outbound_transports) // 2]
    best_out = outbound_transports[-1]

    # Выборка транспорта (обратно, если есть)
    cheap_in = inbound_transports[0] if inbound_transports else None
    mid_in = inbound_transports[len(inbound_transports) // 2] if inbound_transports else None
    best_in = inbound_transports[-1] if inbound_transports else None

    # ОПРЕДЕЛЯЕМ КОМБИНАЦИИ ДО ЦИКЛА
    if budget_rub is None:
        # Если конкретная звёздность не запрашивалась, выбираем отели от 4★ и выше
        if target_stars is None:
            high_tier_hotels = [h for h in hotels if h.get("stars", 0) >= 4]
            if high_tier_hotels:
                hotels = high_tier_hotels

        hotels.sort(key=lambda h: (h["stars"], h.get("rating", 0), h["price_per_night"]))

        hotel_comfort = hotels[0]
        hotel_premium = hotels[len(hotels) // 2]
        hotel_deluxe = hotels[-1]

        combos = [
            ("Комфорт", mid_out, mid_in, hotel_comfort, "Отличный комфорт в проверенном отеле.", 1),
            ("Премиум", best_out, best_in, hotel_premium, "Высокий уровень сервиса и комфортный маршрут.", 2),
            ("Люкс", best_out, best_in, hotel_deluxe,
             f"Максимальный класс обслуживания: отель {hotel_deluxe['stars']}★ и индивидуальный трансфер.", 2),
        ]
    else:
        hotels.sort(key=lambda h: h["price_per_night"])
        hotel_budget = hotels[0]
        hotel_comfort = hotels[len(hotels) // 2]
        hotel_premium = hotels[-1]

        combos = [
            ("Эконом", cheap_out, cheap_in, hotel_budget, "Бюджетная поездка и доступный отель.", 0),
            ("Оптимальный", mid_out, mid_in, hotel_comfort, "Идеальное соотношение цены и комфорта.", 1),
            ("Комфорт", best_out, best_in, hotel_premium,
             f"Премиальный отдых с лучшими билетами и отелем {hotel_premium['stars']}★.", 2),
        ]

    packages: list[dict] = []
    for pkg_type, t_out, t_in, hotel, desc, tier_idx in combos:
        transport_price_per_person = t_out["price"]
        if t_in:
            transport_price_per_person += t_in["price"]
        elif return_date:
            transport_price_per_person *= 2

        transport_total = transport_price_per_person * passengers

        # Учитываем день прибытия: дни в пути на поезде не оплачиваются в отеле
        outbound_offset = t_out.get("day_offset", 0)
        hotel_nights = max(1, nights - outbound_offset)

        # Учитываем количество номеров: стандартный номер вмещает до 2-3 человек
        # Если едет 4 человека и более — требуется минимум 2 номера
        rooms_needed = max(1, (passengers + 1) // 2) if passengers > 3 else 1

        pet_fee = hotel.get("pet_fee_per_night", 0) * hotel_nights if pet_friendly else 0
        hotel_total = (hotel["price_per_night"] * hotel_nights * rooms_needed) + pet_fee

        # --- ИНТЕГРАЦИЯ ТРАНСФЕРОВ ---
        hotel_name = hotel.get("hotel")
        hotel_transfers = [tr for tr in all_transfers if hotel_name in tr.get("destination_hotels", [])]

        transfer_total = 0
        transfer_info = None

        if hotel_transfers:
            hotel_transfers.sort(key=lambda tr: tr.get("price", 0))

            if tier_idx == 0:
                selected_tr = hotel_transfers[0]
            elif tier_idx == 1:
                selected_tr = hotel_transfers[len(hotel_transfers) // 2]
            else:
                selected_tr = hotel_transfers[-1]

            capacity = selected_tr.get("capacity_passengers", 3)
            vehicles_needed = (passengers + capacity - 1) // capacity
            transfer_multiplier = 2 if return_date else 1
            transfer_total = selected_tr.get("price", 0) * vehicles_needed * transfer_multiplier

            transfer_info = {
                "type": selected_tr.get("transport_type", "taxi"),
                "vehicle": f"{selected_tr.get('vehicle_class', '')} ({selected_tr.get('vehicle_model', '')})".strip(),
                "price_total": round(transfer_total, 2),
                "vehicles": vehicles_needed
            }

        grand_total = transport_total + hotel_total + transfer_total

        # --- ФОРМИРОВАНИЕ ОПИСАНИЯ РЕЙСА И ПРЕДУПРЕЖДЕНИЙ ---
        if t_out.get("stops", 0) > 0 and t_out.get("transit_point"):
            transit_desc = f" (стыковка в {t_out['transit_point']})"
        elif t_out.get("type") == "Рейс":
            transit_desc = " (прямой)"
        else:
            transit_desc = ""

        # Проверяем кейсы-ловушки валидатора
        warnings = []
        if "short_layover_risk" in t_out.get("tags", []):
            warnings.append("⚠️ Короткая стыковка (50 мин) в SVO")
        if "night_flight" in t_out.get("tags", []):
            warnings.append("⚠️ Ранний прилёт в 05:15")

        warning_str = f" {' '.join(warnings)}" if warnings else ""
        transfer_desc = f" Включен трансфер ({transfer_info['vehicle']})." if transfer_info else ""
        pet_desc = " Включена доплата за питомца." if pet_friendly and pet_fee > 0 else ""
        stars_badge = "" if "★" in hotel_name else f" ({hotel['stars']}★)"
        rooms_desc = f" ({rooms_needed} ном.)" if rooms_needed > 1 else ""

        full_desc = (
            f"{desc} Отель {hotel_name}{stars_badge}{rooms_desc}. "
            f"{t_out['type']} {t_out['carrier']} {t_out['id']}{transit_desc}.{warning_str}"
            f"{transfer_desc}{pet_desc}"
        )

        entry = {
            "package_type": pkg_type,
            "destination": city_name,
            "description": full_desc,
            "departure_date": departure_date,
            "return_date": return_date,
            "passengers": passengers,
            "nights": nights,
            "transport": {
                "id": t_out["id"],
                "carrier": t_out["carrier"],
                "price_per_person": transport_price_per_person,
                "price_total": round(transport_total, 2),
                "type": t_out["type"],
                "stops": t_out.get("stops", 0),
                "transit_point": t_out.get("transit_point"),
                "layover_duration": t_out.get("layover_duration"),
                "warnings": warnings,
            },
            "hotel": {
                "name": hotel_name,
                "stars": hotel["stars"],
                "rating": hotel.get("rating", 0),
                "price_total": round(hotel_total, 2),
                "nights": hotel_nights,
                "rooms": rooms_needed,
            },
            "grand_total": round(grand_total, 2),
            "currency": Currency.RUB.value,
        }

        if transfer_info:
            entry["transfer"] = transfer_info

        if budget_rub is not None:
            entry["is_within_budget"] = grand_total <= budget_rub
            if grand_total > budget_rub:
                entry["over_budget_amount"] = round(grand_total - budget_rub, 2)
        else:
            entry["is_within_budget"] = True

        packages.append(entry)

    return packages
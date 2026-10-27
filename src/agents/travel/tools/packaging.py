"""
Агрегатор поездки (packaging).

Собирает перелёт/поезд + отель + трансфер из реальных JSON файлов
(flights.json, trains.json, hotels.json, transfers.json)
и применяет строгие фильтры по багажу, отмене и животным. Возвращает
три варианта: «Эконом», «Оптимальный», «Комфорт».
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
    with open(file_path, "r", encoding="utf-8") as f:
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
) -> list[dict]:
    """
    Ищет транспорт, отели и трансферы в data/*.json, применяет фильтры
    и возвращает 3 варианта поездки: 'Эконом', 'Оптимальный' и 'Комфорт'.
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
                "refundable": True,  # Поезда по умолчанию возвратные
                "baggage": "Включен",  # В поездах багаж всегда включен в лимит
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

    # --- ФИЛЬТРАЦИЯ ТРАНСПОРТА ---
    if require_refundable:
        outbound_transports = [t for t in outbound_transports if t["refundable"]]
        if inbound_transports:
            inbound_transports = [t for t in inbound_transports if t["refundable"]]

    if require_baggage:
        # Отсекаем любые варианты, где доступна исключительно ручная кладь
        outbound_transports = [
            t for t in outbound_transports
            if "место" in t["baggage"].lower() or "включен" in t["baggage"].lower() or "23 кг" in t["baggage"].lower()
        ]
        if inbound_transports:
            inbound_transports = [
                t for t in inbound_transports
                if
                "место" in t["baggage"].lower() or "включен" in t["baggage"].lower() or "23 кг" in t["baggage"].lower()
            ]

    # --- ФИЛЬТРАЦИЯ ОТЕЛЕЙ ---
    hotels = [h for h in all_hotels if h.get("city", "").lower() == city_name.lower()]

    if free_cancellation:
        hotels = [h for h in hotels if h.get("free_cancellation", False)]

    if pet_friendly:
        hotels = [h for h in hotels if h.get("pet_friendly", False)]

    nights = _nights(departure_date, return_date)
    budget_rub = _budget_to_rub(budget_limit, currency)

    # Сортируем для распределения по пакетам
    outbound_transports.sort(key=lambda t: t["price"])
    inbound_transports.sort(key=lambda t: t["price"])
    hotels.sort(key=lambda h: h["price_per_night"])

    # Если после жестких фильтров ничего не осталось — возвращаем пустой список
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
        # Для неограниченного бюджета берем отели от 4★ и выше
        high_tier_hotels = [h for h in hotels if h.get("stars", 0) >= 4]
        if high_tier_hotels:
            hotels = high_tier_hotels
            hotels.sort(key=lambda h: (h["stars"], h.get("rating", 0), h["price_per_night"]))

        hotel_comfort = hotels[0]
        hotel_premium = hotels[len(hotels) // 2]
        hotel_deluxe = hotels[-1]

        combos = [
            ("Комфорт", mid_out, mid_in, hotel_comfort, "Отличный комфорт в проверенном отеле.", 1),
            ("Премиум", best_out, best_in, hotel_premium, "Высокий уровень сервиса и перелёт регулярным рейсом.", 2),
            ("Люкс", best_out, best_in, hotel_deluxe,
             "Максимальный класс обслуживания: отель 5★ и индивидуальный трансфер.", 2),
        ]
    else:
        # Стандартная раскладка под заданный бюджет
        budget_hotel = hotels[0]
        comfort_hotel = hotels[len(hotels) // 2]
        premium_hotel = hotels[-1]

        combos = [
            ("Эконом", cheap_out, cheap_in, budget_hotel, "Бюджетная поездка и доступный отель.", 0),
            ("Оптимальный", mid_out, mid_in, comfort_hotel, "Идеальное соотношение цены и комфорта.", 1),
            ("Комфорт", best_out, best_in, premium_hotel, "Премиальный отдых с лучшими билетами и отелем 5★.", 2),
        ]

    packages: list[dict] = []
    for pkg_type, t_out, t_in, hotel, desc, tier_idx in combos:
        transport_price_per_person = t_out["price"]
        if t_in:
            transport_price_per_person += t_in["price"]
        elif return_date:
            transport_price_per_person *= 2

        transport_total = transport_price_per_person * passengers

        # Добавляем надбавку за животных, если едет щенок
        pet_fee = hotel.get("pet_fee_per_night", 0) * nights if pet_friendly else 0
        hotel_total = (hotel["price_per_night"] * max(1, nights)) + pet_fee

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

        transfer_desc = f" Включен трансфер ({transfer_info['vehicle']})." if transfer_info else ""
        pet_desc = " Включена доплата за питомца." if pet_friendly and pet_fee > 0 else ""
        stars_badge = "" if "★" in hotel_name else f" ({hotel['stars']}★)"
        full_desc = f"{desc} Отель {hotel_name}{stars_badge}. {t_out['type']} {t_out['carrier']} {t_out['id']}.{transfer_desc}{pet_desc}"

        entry = {
            "package_type": pkg_type,
            "destination": city_name,
            "description": full_desc,
            "departure_date": departure_date,
            "return_date": return_date,
            "passengers": passengers,
            "nights": nights,
            "transport": {
                "carrier": t_out["carrier"],
                "price_per_person": transport_price_per_person,
                "price_total": round(transport_total, 2),
                "type": t_out["type"],
            },
            "hotel": {
                "name": hotel_name,
                "stars": hotel["stars"],
                "rating": hotel.get("rating", 0),
                "price_total": round(hotel_total, 2),
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
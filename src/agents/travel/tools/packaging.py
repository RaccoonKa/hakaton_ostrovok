"""
Агрегатор поездки (packaging).

Собирает перелёт + отель + трансфер из **mock dataset** и возвращает три
варианта: «Эконом», «Оптимальный», «Комфорт».

Жёсткое правило: агрегатор нельзя вызывать для неполного или неизвестного
запроса. Даже если LLM ошибочно вызовет tool, внутренний guard бросит
``ValueError`` — поиск по неполному запросу не произойдёт.
"""

from __future__ import annotations

from datetime import date

from langchain_core.tools import tool

from agents.travel.tools import mock_dataset as ds
from domain.common import Currency


class AggregatorNotReadyError(ValueError):
    """Запрос не готов к агрегации."""


def assert_aggregator_ready(
    origin: str | None,
    destination: str | None,
    departure_date: str | None,
    passengers: int | None,
) -> None:
    """Deterministic guard перед агрегацией.

    Бросает :class:`AggregatorNotReadyError`, если запрос неполный или
    направление отсутствует в mock dataset.
    """
    if not origin:
        raise AggregatorNotReadyError("origin is required before aggregation")
    if not destination:
        raise AggregatorNotReadyError("destination is required before aggregation")
    if not departure_date:
        raise AggregatorNotReadyError("departure_date is required before aggregation")
    if passengers is None or passengers < 1:
        raise AggregatorNotReadyError("passengers must be >= 1 before aggregation")
    if ds.get_destination_by_city(destination) is None and ds.get_destination_by_iata(destination) is None:
        raise AggregatorNotReadyError(
            f"destination '{destination}' is unknown in the mock dataset"
        )


def _budget_to_rub(budget_limit: float | None, currency: Currency | str | None) -> float | None:
    """Перевести бюджет в рубли ровно один раз.

    Если валюта не указана, сумма трактуется как рублёвая.
    """
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
) -> list[dict]:
    """
    Ищет авиабилеты и отели в mock dataset, агрегирует их и возвращает 3 варианта
    поездки: 'Эконом', 'Оптимальный' и 'Комфорт'.

    :param budget_limit: лимит бюджета в валюте ``currency`` (не в рублях).
    :param currency: валюта бюджета (RUB по умолчанию), переводится в рубли
        ровно один раз для сравнения.

    Вызывать ТОЛЬКО после успешной проверки validate_travel_request.
    Направление должно существовать в mock dataset (иначе будет ошибка).
    """
    assert_aggregator_ready(origin, destination, departure_date, passengers)

    dest = ds.get_destination_by_city(destination) or ds.get_destination_by_iata(destination)
    assert dest is not None  # гарантировано guard'ом
    city = dest.city

    flights = ds.FLIGHTS.get(city, [])
    hotels = ds.HOTELS.get(city, [])
    nights = _nights(departure_date, return_date)

    budget_rub = _budget_to_rub(budget_limit, currency)

    # Сопоставляем: эконом→самый дешёвый билет+budget отель,
    # оптимальный→средний билет+comfort отель,
    # комфорт→самый дорогой билет+premium отель.
    flights_sorted = sorted(flights, key=lambda f: f["price_per_person"])
    cheap_flight = flights_sorted[0] if flights_sorted else None
    mid_flight = flights_sorted[len(flights_sorted) // 2] if flights_sorted else None
    best_flight = flights_sorted[-1] if flights_sorted else None

    hotels_sorted = sorted(hotels, key=lambda h: h["price_per_night"])
    budget_hotel = hotels_sorted[0] if hotels_sorted else None
    comfort_hotel = hotels_sorted[len(hotels_sorted) // 2] if hotels_sorted else None
    premium_hotel = hotels_sorted[-1] if hotels_sorted else None

    combos = [
        ("Эконом", cheap_flight, budget_hotel, "Неброский перелёт и скромный отель."),
        ("Оптимальный", mid_flight, comfort_hotel, "Удобный рейс и хороший отель рядом с центром."),
        ("Комфорт", best_flight, premium_hotel, "Премиальный перелёт и отель высокого уровня."),
    ]

    packages: list[dict] = []
    for pkg_type, flight, hotel, desc in combos:
        if flight is None or hotel is None:
            continue
        flight_total = flight["price_per_person"] * passengers
        hotel_total = hotel["price_per_night"] * max(1, nights)
        grand_total = flight_total + hotel_total
        entry = {
            "package_type": pkg_type,
            "destination": city,
            "description": f"{desc} {flight['airline_name']}, пересадок: {flight['transfers_count']}. {hotel['name']} ({hotel['stars']}★).",
            "departure_date": departure_date,
            "return_date": return_date,
            "passengers": passengers,
            "nights": nights,
            "flight": {
                "offer_id": flight["offer_id"],
                "airline": flight["airline_name"],
                "transfers": flight["transfers_count"],
                "price_per_person": flight["price_per_person"],
                "price_total": round(flight_total, 2),
            },
            "hotel": {
                "hotel_id": hotel["hotel_id"],
                "name": hotel["name"],
                "stars": hotel["stars"],
                "rating": hotel["rating"],
                "location": hotel["location"],
                "price_total": round(hotel_total, 2),
            },
            "grand_total": round(grand_total, 2),
            "currency": Currency.RUB.value,
        }
        if budget_rub is not None:
            entry["is_within_budget"] = grand_total <= budget_rub
            if grand_total > budget_rub:
                entry["over_budget_amount"] = round(grand_total - budget_rub, 2)
        else:
            entry["is_within_budget"] = True
        packages.append(entry)

    return packages


__all__ = [
    "AggregatorNotReadyError",
    "assert_aggregator_ready",
    "search_and_package_trip",
]

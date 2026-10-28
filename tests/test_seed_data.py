"""
Тесты целостности и валидности сидовых данных (data/*.json).
"""

import json
from datetime import date, datetime, timedelta
from pathlib import Path

from domain.common import Currency, MealPlan, TransportType
from domain.flight import Flight
from domain.hotel import Hotel
from domain.transfer import Transfer
from domain.transport import Transport

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def test_destinations_json_valid():
    dest_path = DATA_DIR / "destinations.json"
    assert dest_path.exists(), "data/destinations.json отсутствует"

    with open(dest_path, encoding="utf-8") as f:
        destinations = json.load(f)

    assert len(destinations) == 5
    cities = {d["city"] for d in destinations}
    assert cities == {"Сочи", "Калининград", "Санкт-Петербург", "Стамбул", "Анталья"}

    for d in destinations:
        assert "weather" in d
        assert "seasonality" in d
        assert "tags" in d
        assert "estimated_budget_per_person" in d
        assert "documents" in d
        assert "flight_time_from_moscow" in d
        assert len(d["tags"]) >= 4


def test_hotels_json_valid():
    hotels_path = DATA_DIR / "hotels.json"
    assert hotels_path.exists(), "data/hotels.json отсутствует"

    with open(hotels_path, encoding="utf-8") as f:
        hotels = json.load(f)

    assert len(hotels) >= 25

    hotels_by_city: dict[str, list[dict]] = {}
    for h in hotels:
        hotels_by_city.setdefault(h["city"], []).append(h)

    for city in ["Сочи", "Калининград", "Санкт-Петербург", "Стамбул", "Анталья"]:
        city_hotels = hotels_by_city.get(city, [])
        assert len(city_hotels) >= 4, f"Мало отелей в {city}"
        pet_hotels = [h for h in city_hotels if h.get("pet_friendly") is True]
        assert len(pet_hotels) >= 1, f"В {city} нет pet-friendly отелей!"
        for ph in pet_hotels:
            assert ph.get("pet_fee_per_night", 0) > 0

    # Проверка Bridge Resort all inclusive и Mercure Rosa Khutor
    hotel_names = [h["hotel"] for h in hotels]
    assert any("Bridge Resort" in name for name in hotel_names)
    assert any("Mercure Rosa Khutor" in name for name in hotel_names)
    assert any("Radisson Collection Paradise" in name for name in hotel_names)
    assert any("Rixos Krasnaya Polyana" in name for name in hotel_names)
    assert any("Schloss Hotel Yantarny" in name for name in hotel_names)
    assert any("Four Seasons Hotel Lion Palace" in name for name in hotel_names)
    assert any("Ciragan Palace Kempinski" in name for name in hotel_names)
    assert any("Rixos Downtown Antalya" in name for name in hotel_names)

    # Проверка Pydantic валидации
    for h in hotels:
        hotel_obj = Hotel(
            hotel=h["hotel"],
            city=h["city"],
            district=h.get("district"),
            check_in=date(2026, 7, 1),
            check_out=date(2026, 7, 8),
            guests=2,
            room_type=h.get("room_type"),
            meal_plan=MealPlan(h["meal_plan"]) if h.get("meal_plan") else None,
            price=h["price_per_night"] * 7,
            currency=Currency(h["currency"]),
            rating=h.get("rating"),
            image_url=h.get("image_url"),
            pet_friendly=h.get("pet_friendly", False),
            pet_fee_per_night=h.get("pet_fee_per_night", 0.0),
            check_in_time=h.get("check_in_time", "14:00"),
            check_out_time=h.get("check_out_time", "12:00"),
            early_check_in_fee=h.get("early_check_in_fee", 0.0),
            free_cancellation=h.get("free_cancellation", True),
            non_refundable_discount_pct=h.get("non_refundable_discount_pct", 0),
            refundable=h.get("refundable", True),
            cancellation_conditions=h.get("cancellation_conditions"),
            amenities=h.get("amenities", []),
        )
        assert hotel_obj.hotel == h["hotel"]


def test_flights_json_valid():
    flights_path = DATA_DIR / "flights.json"
    assert flights_path.exists(), "data/flights.json отсутствует"

    with open(flights_path, encoding="utf-8") as f:
        flights = json.load(f)

    assert len(flights) >= 20

    # Проверка кейса-ловушки DP 115
    dp115 = next((f for f in flights if f["flight_number"] == "DP 115"), None)
    assert dp115 is not None, "Рейс DP 115 не найден"
    assert dp115["arrival_time"] == "05:15"
    assert "validator_trap" in dp115["tags"]

    # Проверка комфортных рейсов
    assert any(f["flight_number"] == "SU 1122" for f in flights)
    assert any(f["flight_number"] == "S7 2045" for f in flights)

    # Проверка Pydantic валидации
    for f in flights:
        flight_obj = Flight(
            origin=f["origin"],
            destination=f["destination"],
            departure_at=datetime.fromisoformat(f["reference_departure"]),
            arrival_at=datetime.fromisoformat(f["reference_arrival"]),
            duration=timedelta(minutes=235) if f.get("duration") == "PT3H55M" else None,
            carrier=f.get("carrier"),
            flight_number=f.get("flight_number"),
            stops=f.get("stops", 0),
            baggage=f.get("baggage"),
            price=f.get("price"),
            currency=Currency(f["currency"]) if f.get("currency") else None,
            refundable=f.get("refundable"),
            changeable=f.get("changeable"),
            transit_point=f.get("transit_point"),
        )
        assert flight_obj.flight_number == f["flight_number"]


def test_trains_json_valid():
    trains_path = DATA_DIR / "trains.json"
    assert trains_path.exists(), "data/trains.json отсутствует"

    with open(trains_path, encoding="utf-8") as f:
        trains = json.load(f)

    assert len(trains) >= 20
    train_numbers = {t["train_number"] for t in trains}
    for req in [
        "104В", "103В", "772А", "771А",
        "029Ч", "030Ч", "035А", "036А",
        "001Г", "002Г", "727М", "732М",
        "055Е", "056Е", "491Э", "492Э",
        "079Ч", "080Ч",
    ]:
        assert req in train_numbers, f"Поезд {req} отсутствует в trains.json"

    # Проверка 104В двухэтажный поезд (+1 день)
    train104 = next(t for t in trains if t["train_number"] == "104В")
    assert train104["departure_time"] == "10:52"
    assert train104["arrival_time"] == "10:32"
    assert train104["day_offset"] == 1

    # Проверка 035А Северная Пальмира (+2 дня)
    train035 = next(t for t in trains if t["train_number"] == "035А")
    assert train035["day_offset"] == 2
    assert train035["duration_minutes"] >= 2200

    # Проверка 029Ч «Янтарь» транзитных требований Литвы
    train029 = next(t for t in trains if t["train_number"] == "029Ч")
    assert "УПД-ЖД" in train029.get("conditions", "")
    assert "заграничный паспорт" in train029.get("conditions", "").lower()

    # Pydantic валидация
    for t in trains:
        t_obj = Transport(
            origin=t["origin"],
            destination=t["destination"],
            departure_at=datetime.fromisoformat(t["reference_departure"]),
            arrival_at=datetime.fromisoformat(t["reference_arrival"]),
            duration=timedelta(minutes=t["duration_minutes"]),
            transport_type=TransportType.TRAIN,
            carrier=t.get("carrier"),
            price=t.get("price"),
            currency=Currency(t["currency"]) if t.get("currency") else None,
            conditions=t.get("conditions"),
            stops=t.get("stops", 0),
            transit_point=t.get("transit_point"),
        )
        assert t_obj.carrier == t["carrier"]
        assert t_obj.stops == 0


def test_transfers_json_valid():
    transfers_path = DATA_DIR / "transfers.json"
    assert transfers_path.exists(), "data/transfers.json отсутствует"

    with open(transfers_path, encoding="utf-8") as f:
        transfers = json.load(f)

    assert len(transfers) >= 15
    hubs = {tr["hub_id"] for tr in transfers}
    expected_hubs = {"AER", "ADLER_STATION", "SOCHI_STATION", "KGD", "LED", "MOSCOW_STATION_SPB", "IST", "AYT"}
    assert expected_hubs.issubset(hubs)

    # Проверка классов авто
    classes = {tr["vehicle_class"] for tr in transfers}
    assert {"economy", "comfort", "minivan"}.issubset(classes)

    # Проверка кейса «Трансфер съедает выгоду»
    polyana_mini = next(
        (tr for tr in transfers if tr["hub_id"] == "AER" and "Красная Поляна" in tr["destination"] and tr["vehicle_class"] == "minivan"),
        None,
    )
    assert polyana_mini is not None
    assert polyana_mini["price"] >= 7000.0, "Цена минивэна в горы должна быть высокой для кейса съедания выгоды"

    # Pydantic валидация
    for tr in transfers:
        tr_obj = Transfer(
            origin=tr["origin"],
            destination=tr["destination"],
            departure_at=datetime.fromisoformat(tr["reference_departure"]),
            arrival_at=datetime.fromisoformat(tr["reference_arrival"]),
            duration=timedelta(minutes=tr["duration_minutes"]),
            transport_type=TransportType(tr["transport_type"]),
            price=tr.get("price"),
            currency=Currency(tr["currency"]) if tr.get("currency") else None,
            conditions=tr.get("conditions"),
        )
        assert tr_obj.origin == tr["origin"]

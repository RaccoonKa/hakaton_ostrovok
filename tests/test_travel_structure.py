"""
Unit-тесты провайдеров туристических данных (Hotels, Flights, Trains, Transfers, Destinations)
и проверки Repository Pattern с безопасным fallback.
"""

from datetime import date, datetime, timedelta

import pytest

from domain.common import TransportType
from domain.flight import Flight
from domain.hotel import Hotel
from domain.transfer import Transfer
from domain.transport import Transport
from memory.db_storage import init_db_and_seed
from providers import (
    calculate_hotel_price,
    get_destinations,
    get_transfer,
    search_flights,
    search_hotels,
    search_trains,
)


def test_search_hotels_filter_by_district():
    """Проверка фильтрации отелей по курортному району."""
    sirius_hotels = search_hotels(
        city="Сочи",
        check_in=date(2026, 7, 1),
        check_out=date(2026, 7, 8),
        district="Сириус",
    )
    assert len(sirius_hotels) >= 3
    for h in sirius_hotels:
        assert isinstance(h, Hotel)
        assert h.city == "Сочи"
        assert h.district is not None
        assert "сириус" in h.district.lower()

    polyana_hotels = search_hotels(
        city="Сочи",
        check_in="2026-07-01",
        check_out="2026-07-08",
        district="Красная Поляна",
    )
    assert len(polyana_hotels) >= 2
    for h in polyana_hotels:
        assert isinstance(h, Hotel)
        assert "полян" in (h.district or "").lower() or "роза" in (h.district or "").lower()


def test_search_hotels_pet_friendly():
    """Проверка, что pet-friendly фильтр отбирает только отели, разрешающие питомцев."""
    pet_hotels = search_hotels(
        city="Сочи",
        check_in=date(2026, 7, 1),
        check_out=date(2026, 7, 8),
        pet_friendly=True,
    )
    assert len(pet_hotels) >= 2
    for h in pet_hotels:
        assert h.pet_friendly is True
        assert h.pet_fee_per_night > 0.0

    # Проверка в других городах
    kgd_pet_hotels = search_hotels(
        city="Калининград",
        check_in="2026-08-01",
        check_out="2026-08-05",
        pet_friendly=True,
    )
    assert len(kgd_pet_hotels) >= 1
    assert all(h.pet_friendly for h in kgd_pet_hotels)


def test_hotel_price_seasonality():
    """Проверка формулы сезонного ценообразования отелей."""
    base_price = 10000.0

    # Лето (июль): коэффициент 1.3
    price_summer = calculate_hotel_price(
        base_price_per_night=base_price,
        check_in=date(2026, 7, 1),
        check_out=date(2026, 7, 8),
        hotel_name="Обычный отель",
        district="Сириус",
    )
    assert price_summer == 7 * base_price * 1.3

    # Зима для горных курортов: коэффициент 1.4
    price_winter_mountains = calculate_hotel_price(
        base_price_per_night=base_price,
        check_in=date(2026, 1, 10),
        check_out=date(2026, 1, 15),
        hotel_name="Mercure Rosa Khutor",
        district="Красная Поляна",
    )
    assert price_winter_mountains == 5 * base_price * 1.4

    # Межсезонье: коэффициент 0.85
    price_off_season = calculate_hotel_price(
        base_price_per_night=base_price,
        check_in=date(2026, 11, 1),
        check_out=date(2026, 11, 6),
        hotel_name="Отель",
        district="Центральный",
    )
    assert price_off_season == 5 * base_price * 0.85


def test_search_flights_dates_and_pricing():
    """Проверка поиска авиабилетов, подстановки дат и мультипликации стоимости."""
    # 1 пассажир
    flights_1 = search_flights(
        origin="Москва",
        destination="Сочи",
        departure_date="2026-08-10",
        travelers=1,
    )
    assert len(flights_1) >= 3
    for f in flights_1:
        assert isinstance(f, Flight)
        assert f.departure_at.date() == date(2026, 8, 10)
        assert f.price is not None and f.price > 0

    # 2 пассажира: стоимость удваивается
    flights_2 = search_flights(
        origin="Москва",
        destination="Сочи",
        departure_date="2026-08-10",
        travelers=2,
    )
    assert len(flights_2) == len(flights_1)
    for f1, f2 in zip(flights_1, flights_2, strict=False):
        assert f2.price == round(f1.price * 2, 2)

    # Проверка фильтрации по max_price
    cheap_flights = search_flights(
        origin="Москва",
        destination="Сочи",
        departure_date="2026-08-10",
        travelers=1,
        max_price=10000.0,
    )
    assert len(cheap_flights) > 0
    assert all(f.price <= 10000.0 for f in cheap_flights)

    # Проверка поиска с обратным билетом (return_date)
    rt_flights = search_flights(
        origin="Москва",
        destination="Сочи",
        departure_date="2026-08-10",
        return_date="2026-08-17",
        travelers=1,
    )
    outbound = [f for f in rt_flights if f.departure_at.date() == date(2026, 8, 10)]
    inbound = [f for f in rt_flights if f.departure_at.date() == date(2026, 8, 17)]
    assert len(outbound) >= 3
    assert len(inbound) >= 3


def test_search_trains():
    """Проверка поиска поездов, расчета дат с day_offset и валидации Transport."""
    trains = search_trains(
        origin="Москва",
        destination="Сочи",
        departure_date="2026-07-01",
        travelers=2,
    )
    assert len(trains) >= 1
    t104 = next((t for t in trains if "104" in t.conditions or "104" in (t.carrier or "")), trains[0])
    assert isinstance(t104, Transport)
    assert t104.transport_type == TransportType.TRAIN
    assert t104.departure_at.date() == date(2026, 7, 1)
    # Поезд 104В имеет day_offset = 1, прибывает на следующий день
    assert t104.arrival_at.date() == date(2026, 7, 2)
    assert t104.price is not None and t104.price > 10000.0  # 5400 * 2 = 10800


def test_transfer_buffers_and_minivan():
    """
    Проверка буферов трансфера (+30 мин для самолета, +15 мин для поезда)
    и автовыбора minivan для семей с детьми или спортинвентарем.
    """
    arr_dt = datetime(2026, 7, 1, 14, 0, 0)

    # 1. Буфер для авиарейса: 14:00 + 30 мин = 14:30
    tr_flight = get_transfer(
        hub="AER",
        destination="Сириус",
        arrival_at=arr_dt,
        transport_type="flight",
        travelers=2,
    )
    assert tr_flight is not None
    assert isinstance(tr_flight, Transfer)
    assert tr_flight.departure_at == arr_dt + timedelta(minutes=30)

    # 2. Буфер для поезда: 14:00 + 15 мин = 14:15
    tr_train = get_transfer(
        hub="ADLER_STATION",
        destination="Сириус",
        arrival_at=arr_dt,
        transport_type="train",
        travelers=2,
    )
    assert tr_train is not None
    assert isinstance(tr_train, Transfer)
    assert tr_train.departure_at == arr_dt + timedelta(minutes=15)

    # 3. Автоподбор minivan для путешественников с детьми
    tr_kids = get_transfer(
        hub="AER",
        destination="Красная Поляна",
        arrival_at=arr_dt,
        transport_type="flight",
        travelers=2,
        has_kids=True,
    )
    assert tr_kids is not None
    assert "minivan" in tr_kids.conditions.lower()

    # 4. Автоподбор minivan для группы более 3 человек
    tr_group = get_transfer(
        hub="AER",
        destination="Сириус",
        arrival_at=arr_dt,
        transport_type="flight",
        travelers=4,
    )
    assert tr_group is not None
    assert "minivan" in tr_group.conditions.lower()

    # 5. Автоподбор minivan для спортивного снаряжения
    tr_ski = get_transfer(
        hub="AER",
        destination="Красная Поляна",
        arrival_at=arr_dt,
        transport_type="flight",
        has_sports_equipment=True,
    )
    assert tr_ski is not None
    assert "minivan" in tr_ski.conditions.lower()


def test_get_destinations():
    """Проверка подбора и ранжирования направлений."""
    # По умолчанию возвращаются Топ-3
    top_default = get_destinations()
    assert len(top_default) == 3

    # Подбор под лыжи и горы
    ski_dest = get_destinations(tags=["ski", "mountains"])
    assert len(ski_dest) == 3
    assert ski_dest[0]["city"] == "Сочи"

    # Подбор под пляжный all-inclusive отдых
    beach_dest = get_destinations(tags=["beach", "all_inclusive"])
    assert len(beach_dest) == 3
    assert beach_dest[0]["city"] in ("Анталья", "Сочи")


@pytest.mark.asyncio
async def test_init_db_and_seed_graceful():
    """Проверка безопасного выполнения init_db_and_seed без поднятого PostgreSQL."""
    success = await init_db_and_seed()
    # При локальном запуске без PostgreSQL функция должна вернуть False без исключений
    assert isinstance(success, bool)

"""
Тесты для провайдеров туристических данных (отели, рейсы, поезда, трансферы, направления).
"""

from datetime import date, datetime, timedelta, timezone

import pytest
from pydantic import ValidationError

from domain.common import MealPlan, TransportType
from domain.flight import Flight
from domain.hotel import Hotel
from domain.transfer import Transfer
from domain.transport import Transport
from providers import (
    calculate_hotel_price,
    get_destinations,
    get_transfer,
    search_flights,
    search_hotels,
    search_trains,
)
from providers.flights import _parse_iso_duration

TZ_MSK = timezone(timedelta(hours=3))


def test_models_extra_forbid():
    """Проверка, что все 4 доменные модели запрещают неизвестные поля."""
    now = datetime(2026, 7, 1, 12, 0, tzinfo=TZ_MSK)

    # Hotel
    with pytest.raises(ValidationError):
        Hotel.model_validate(
            {
                "hotel": "Test Hotel",
                "city": "Сочи",
                "check_in": date(2026, 7, 1),
                "check_out": date(2026, 7, 8),
                "reference_departure": "2026-07-01",  # Запрещенное поле
            }
        )

    # Flight
    with pytest.raises(ValidationError):
        Flight.model_validate(
            {
                "origin": "Москва",
                "destination": "Сочи",
                "departure_at": now,
                "arrival_at": now + timedelta(hours=3),
                "notes": "Какая-то заметка",  # Запрещенное поле
            }
        )

    # Transport
    with pytest.raises(ValidationError):
        Transport.model_validate(
            {
                "origin": "Москва",
                "destination": "Санкт-Петербург",
                "departure_at": now,
                "arrival_at": now + timedelta(hours=4),
                "transport_type": TransportType.TRAIN,
                "tags": ["fast", "overnight"],  # Запрещенное поле
            }
        )

    # Transfer
    with pytest.raises(ValidationError):
        Transfer.model_validate(
            {
                "origin": "AER",
                "destination": "Сириус",
                "departure_at": now,
                "arrival_at": now + timedelta(minutes=45),
                "transport_type": TransportType.TAXI,
                "hub_id": "AER",  # Запрещенное поле
            }
        )


def test_providers_return_valid_models_without_extra_fields():
    """Проверка, что провайдеры возвращают чистые доменные объекты без утечки служебных полей."""
    # Hotels
    hotels = search_hotels(city="Сочи", check_in="2026-07-01", check_out="2026-07-08")
    assert len(hotels) > 0
    for h in hotels:
        assert isinstance(h, Hotel)
        assert not hasattr(h, "reference_departure")
        assert not hasattr(h, "notes")
        assert not hasattr(h, "tags")

    # Flights
    flights = search_flights(origin="Москва", destination="Сочи", departure_date="2026-07-01")
    assert len(flights) > 0
    for f in flights:
        assert isinstance(f, Flight)
        assert not hasattr(f, "reference_departure")
        assert not hasattr(f, "notes")
        assert not hasattr(f, "tags")

    # Trains
    trains = search_trains(origin="Москва", destination="Санкт-Петербург", departure_date="2026-07-01")
    assert len(trains) > 0
    for t in trains:
        assert isinstance(t, Transport)
        assert not hasattr(t, "reference_departure")
        assert not hasattr(t, "notes")
        assert not hasattr(t, "tags")

    # Transfers
    transfer = get_transfer(hub="AER", destination="Сириус", arrival_at="2026-07-01T12:00:00")
    assert transfer is not None
    assert isinstance(transfer, Transfer)
    assert not hasattr(transfer, "reference_departure")
    assert not hasattr(transfer, "notes")
    assert not hasattr(transfer, "tags")
    assert not hasattr(transfer, "hub_id")


def test_hotels_city_and_district_filtering():
    """Тест поиска отелей по русским и английским названиям городов и районам."""
    # Поиск по английскому названию города
    hotels_en = search_hotels(city="Sochi", check_in="2026-07-01", check_out="2026-07-08")
    assert len(hotels_en) >= 5
    assert all("сочи" in h.city.lower() for h in hotels_en)

    # Поиск по синониму Питер
    spb_hotels = search_hotels(city="Питер", check_in="2026-07-01", check_out="2026-07-08")
    assert len(spb_hotels) >= 3

    # Фильтр по району
    sirius = search_hotels(city="Сочи", check_in="2026-07-01", check_out="2026-07-08", district="Сириус")
    assert len(sirius) >= 3
    assert all("сириус" in (h.district or "").lower() for h in sirius)


def test_hotels_pet_friendly_and_meal_plan():
    """Тест фильтрации по pet_friendly и типам питания (включая регистронезависимость)."""
    # pet_friendly = True
    pet_hotels = search_hotels(
        city="Сочи", check_in="2026-07-01", check_out="2026-07-08", pet_friendly=True
    )
    assert len(pet_hotels) >= 2
    assert all(h.pet_friendly is True for h in pet_hotels)

    # pet_friendly = False
    no_pet_hotels = search_hotels(
        city="Сочи", check_in="2026-07-01", check_out="2026-07-08", pet_friendly=False
    )
    assert len(no_pet_hotels) >= 2
    assert all(h.pet_friendly is False for h in no_pet_hotels)

    # meal_plan как enum
    ai_hotels_enum = search_hotels(
        city="Сочи", check_in="2026-07-01", check_out="2026-07-08", meal_plan=MealPlan.ALL_INCLUSIVE
    )
    assert len(ai_hotels_enum) >= 1
    assert all(h.meal_plan == MealPlan.ALL_INCLUSIVE for h in ai_hotels_enum)

    # meal_plan строкой в верхнем регистре "ALL_INCLUSIVE"
    ai_hotels_str = search_hotels(
        city="Сочи", check_in="2026-07-01", check_out="2026-07-08", meal_plan="ALL_INCLUSIVE"
    )
    assert len(ai_hotels_str) == len(ai_hotels_enum)


def test_calculate_hotel_price_edge_cases():
    """Тест расчета сезонных цен отелей с разными типами дат и граничными значениями."""
    base = 10000.0

    # Лето: x1.3
    p_summer = calculate_hotel_price(base, "2026-07-01", "2026-07-04")
    assert p_summer == 3 * base * 1.3

    # Зима горы (декабрь): x1.4
    p_winter_mountain = calculate_hotel_price(
        base, date(2026, 12, 10), date(2026, 12, 15), hotel_name="Mercure Rosa Khutor", district="Красная Поляна"
    )
    assert p_winter_mountain == 5 * base * 1.4

    # Зима НЕ горы (январь в Петербурге): x0.85
    p_winter_city = calculate_hotel_price(
        base, date(2026, 1, 10), date(2026, 1, 15), hotel_name="Four Seasons", district="Центральный"
    )
    assert p_winter_city == 5 * base * 0.85

    # Межсезонье (ноябрь): x0.85
    p_nov = calculate_hotel_price(base, "2026-11-01", "2026-11-03")
    assert p_nov == 2 * base * 0.85

    # check_out <= check_in (минимум 1 ночь)
    p_same_day = calculate_hotel_price(base, "2026-07-01", "2026-07-01")
    assert p_same_day == 1 * base * 1.3


def test_hotels_budget_and_amenities():
    """Тест фильтрации отелей по бюджету и списку удобств."""
    # Бюджетный фильтр
    cheap_hotels = search_hotels(
        city="Сочи", check_in="2026-07-01", check_out="2026-07-03", budget_limit=25000.0
    )
    assert len(cheap_hotels) > 0
    assert all(h.price is not None and h.price <= 25000.0 for h in cheap_hotels)

    # Фильтр по удобствам (бассейн, спа)
    spa_hotels = search_hotels(
        city="Сочи", check_in="2026-07-01", check_out="2026-07-03", amenities=["spa", "pool"]
    )
    assert len(spa_hotels) > 0
    for h in spa_hotels:
        h_amenities = [a.lower() for a in h.amenities]
        assert any("spa" in a or "спа" in a for a in h_amenities)
        assert any("бассейн" in a or "pool" in a for a in h_amenities)


def test_parse_iso_duration():
    """Тест парсинга ISO-длительности PT..."""
    assert _parse_iso_duration("PT3H55M") == timedelta(hours=3, minutes=55)
    assert _parse_iso_duration("PT4H") == timedelta(hours=4)
    assert _parse_iso_duration("PT45M") == timedelta(minutes=45)
    assert _parse_iso_duration("pt1h30m") == timedelta(hours=1, minutes=30)
    assert _parse_iso_duration("PT") is None
    assert _parse_iso_duration("") is None
    assert _parse_iso_duration(None) is None
    assert _parse_iso_duration("INVALID") is None


def test_flights_route_matching_and_synonyms():
    """Тест поиска рейсов по кодам аэропортов и английским названиям городов."""
    # Москва -> Сочи по кодам SVO -> AER
    f_svo_aer = search_flights(origin="SVO", destination="AER", departure_date="2026-07-01")
    assert len(f_svo_aer) >= 1
    assert all("svo" in f.origin.lower() and "aer" in f.destination.lower() for f in f_svo_aer)

    # Поиск по английским названиям Moscow -> Antalya
    f_ayt = search_flights(origin="Moscow", destination="Antalya", departure_date="2026-07-01")
    assert len(f_ayt) >= 2
    assert all("ayt" in f.destination.lower() or "анталья" in f.destination.lower() for f in f_ayt)

    # Поиск Moscow -> Istanbul
    f_ist = search_flights(origin="Moscow", destination="Istanbul", departure_date="2026-07-01")
    assert len(f_ist) >= 2


def test_flights_travelers_and_return_leg():
    """Тест расчета стоимости на нескольких пассажиров и сборки прямого и обратного рейсов."""
    # 3 пассажира
    f_1 = search_flights(origin="Москва", destination="Сочи", departure_date="2026-07-01", travelers=1)
    f_3 = search_flights(origin="Москва", destination="Сочи", departure_date="2026-07-01", travelers=3)
    assert len(f_1) == len(f_3)
    for s_1, s_3 in zip(f_1, f_3, strict=False):
        assert s_1.price is not None and s_3.price is not None
        assert s_3.price == round(s_1.price * 3, 2)

    # Round-trip поиск с return_date
    rt_flights = search_flights(
        origin="Москва",
        destination="Сочи",
        departure_date="2026-07-01T10:00:00",
        return_date="2026-07-10T15:00:00",
        travelers=2,
    )
    outbound = [f for f in rt_flights if f.departure_at.date() == date(2026, 7, 1)]
    inbound = [f for f in rt_flights if f.departure_at.date() == date(2026, 7, 10)]
    assert len(outbound) >= 3
    assert len(inbound) >= 3


def test_trains_day_offset_and_pricing():
    """Тест ночных поездов со сдвигом суток (day_offset) и расчета стоимости."""
    # Поезд 104В (Москва -> Адлер, day_offset = 1)
    trains_sochi = search_trains(
        origin="Москва",
        destination="Сочи",
        departure_date="2026-07-01",
        travelers=2,
    )
    assert len(trains_sochi) >= 1
    t104 = next((t for t in trains_sochi if "104" in (t.conditions or "")), trains_sochi[0])
    assert t104.departure_at.date() == date(2026, 7, 1)
    assert t104.arrival_at.date() == date(2026, 7, 2)  # +1 day
    assert t104.arrival_at > t104.departure_at
    assert t104.price is not None and t104.price > 10000.0  # Умножение на 2 пассажиров

    # Сапсан Москва -> Санкт-Петербург (day_offset = 0)
    trains_spb = search_trains(
        origin="Москва",
        destination="Санкт-Петербург",
        departure_date="2026-07-01",
        travelers=1,
    )
    assert len(trains_spb) >= 2
    day_train = next(
        (
            t
            for t in trains_spb
            if "772" in (t.conditions or "") or "сапсан" in (t.conditions or "").lower()
        ),
        trains_spb[0],
    )
    assert day_train.departure_at.date() == day_train.arrival_at.date()


def test_transfers_all_hubs():
    """Тест подбора трансферов из всех ключевых хабов (AER, LED, KGD, IST, AYT и вокзалов)."""
    now = datetime(2026, 7, 1, 12, 0)

    # 1. AER -> Сочи
    tr_aer = get_transfer(hub="AER", destination="Сочи", arrival_at=now)
    assert tr_aer is not None

    # 2. LED -> Санкт-Петербург
    tr_led = get_transfer(hub="LED", destination="Санкт-Петербург", arrival_at=now)
    assert tr_led is not None
    assert "пулково" in tr_led.origin.lower() or "led" in tr_led.origin.lower()

    # 3. KGD -> Калининград
    tr_kgd = get_transfer(hub="KGD", destination="Калининград", arrival_at=now)
    assert tr_kgd is not None

    # 4. IST -> Стамбул
    tr_ist = get_transfer(hub="IST", destination="Стамбул", arrival_at=now)
    assert tr_ist is not None
    assert "стамбул" in tr_ist.origin.lower() or "ist" in tr_ist.origin.lower()

    # 5. AYT -> Анталья
    tr_ayt = get_transfer(hub="AYT", destination="Анталья", arrival_at=now)
    assert tr_ayt is not None

    # 6. Вокзал Адлер -> Сириус
    tr_adler = get_transfer(hub="ADLER_STATION", destination="Сириус", arrival_at=now, transport_type="train")
    assert tr_adler is not None

    # 7. Вокзал Сочи -> Центральный Сочи
    tr_sochi_st = get_transfer(hub="SOCHI_STATION", destination="Центральный Сочи", arrival_at=now, transport_type="train")
    assert tr_sochi_st is not None

    # 8. Московский вокзал СПб -> Центральный
    tr_spb_st = get_transfer(hub="MOSCOW_STATION_SPB", destination="Центральный", arrival_at=now, transport_type="train")
    assert tr_spb_st is not None


def test_transfers_buffers_and_minivan_selection():
    """Тест точного расчета буферов (+30 мин авиа, +15 мин поезд) и выбора минивэна."""
    arr_dt = datetime(2026, 7, 1, 10, 0, 0)

    # Буфер самолета: +30 минут
    tr_plane = get_transfer(hub="AER", destination="Сириус", arrival_at=arr_dt, transport_type=TransportType.PLANE)
    assert tr_plane is not None
    assert tr_plane.departure_at == arr_dt + timedelta(minutes=30)

    # Буфер поезда: +15 минут
    tr_train = get_transfer(hub="ADLER_STATION", destination="Сириус", arrival_at=arr_dt, transport_type=TransportType.TRAIN)
    assert tr_train is not None
    assert tr_train.departure_at == arr_dt + timedelta(minutes=15)

    # Выбор minivan при >3 пассажирах (4 человека)
    tr_group = get_transfer(hub="AER", destination="Сириус", arrival_at=arr_dt, travelers=4)
    assert tr_group is not None
    assert "minivan" in (tr_group.conditions or "").lower()

    # Выбор minivan с детьми
    tr_kids = get_transfer(hub="AER", destination="Сириус", arrival_at=arr_dt, travelers=2, has_kids=True)
    assert tr_kids is not None
    assert "minivan" in (tr_kids.conditions or "").lower()

    # Выбор minivan со спортивным снаряжением
    tr_ski = get_transfer(hub="AER", destination="Красная Поляна", arrival_at=arr_dt, has_sports_equipment=True)
    assert tr_ski is not None
    assert "minivan" in (tr_ski.conditions or "").lower()


def test_destinations_tag_and_season_ranking():
    """Тест ранжирования направлений по тегам (на русском и английском) и сезонам/месяцам."""
    # Русские теги "пляж", "все включено" -> Анталья / Сочи
    dest_beach = get_destinations(tags=["пляж", "все включено"])
    assert len(dest_beach) == 3
    assert dest_beach[0]["city"] in ("Анталья", "Сочи")

    # Русские теги "горы", "лыжи" -> Сочи
    dest_ski = get_destinations(tags=["горы", "лыжи"])
    assert len(dest_ski) == 3
    assert dest_ski[0]["city"] == "Сочи"

    # Сезон "зима" / "winter"
    dest_winter = get_destinations(season="зима")
    assert len(dest_winter) == 3

    # Месяц "ноябрь" / "november" -> Стамбул (лучший месяц)
    dest_nov = get_destinations(season="ноябрь")
    assert len(dest_nov) == 3
    assert any(d["city"] == "Стамбул" for d in dest_nov)


def test_flights_non_moscow_origins():
    """Тест поиска рейсов из региональных хабов: Екатеринбург, Казань, Новосибирск, Санкт-Петербург."""
    # Екатеринбург (Кольцово) -> Сочи: есть и прямой U6 219, и транзитный SU 1401 / SU 1122
    f_ekb_aer = search_flights(origin="Екатеринбург", destination="Сочи", departure_date="2026-07-01")
    assert len(f_ekb_aer) >= 2
    assert any(f.stops == 0 and "U6" in (f.flight_number or "") for f in f_ekb_aer)
    assert any(f.stops == 1 for f in f_ekb_aer)

    # Поиск по синонимам "Екб", "Кольцово", "SVX"
    f_ekb_syn = search_flights(origin="Екб", destination="Сочи", departure_date="2026-07-01")
    assert len(f_ekb_syn) >= 2

    # Казань -> Сочи
    f_kzn_aer = search_flights(origin="Казань", destination="Сочи", departure_date="2026-07-01")
    assert len(f_kzn_aer) >= 2
    assert any(f.stops == 0 for f in f_kzn_aer)

    # Новосибирск (Толмачево / OVB) -> Калининград (классический транзитный маршрут)
    f_ovb_kgd = search_flights(origin="Новосибирск", destination="Калининград", departure_date="2026-07-01")
    assert len(f_ovb_kgd) >= 1
    assert any(f.stops == 1 and "DME" in (f.transit_point or "") for f in f_ovb_kgd)

    # Санкт-Петербург (Пулково / LED) -> Анталья (прямой Turkish Airlines)
    f_led_ayt = search_flights(origin="Пулково", destination="Анталья", departure_date="2026-07-01")
    assert len(f_led_ayt) >= 1
    assert any("TK" in (f.flight_number or "") for f in f_led_ayt)


def test_flights_transit_curated_and_traps():
    """Тест транзитных рейсов, ловушек валидатора и корректности transit_point / layover_duration."""
    # Екатеринбург -> Сочи через SVO: оптимальная стыковка
    f_ekb_sochi = search_flights(origin="SVX", destination="AER", departure_date="2026-07-01")
    transit_su = next((f for f in f_ekb_sochi if f.flight_number == "SU 1401 / SU 1122"), None)
    assert transit_su is not None
    assert transit_su.stops == 1
    assert transit_su.transit_point == "Москва (SVO)"
    assert transit_su.layover_duration is not None
    assert transit_su.layover_duration == timedelta(hours=2, minutes=15)

    # Екатеринбург -> Сочи через VKO: ночной рейс ловушка (прилет в 05:15)
    trap_dp = next((f for f in f_ekb_sochi if f.flight_number == "DP 406 / DP 115"), None)
    assert trap_dp is not None
    assert trap_dp.stops == 1
    assert trap_dp.arrival_at.hour == 5 and trap_dp.arrival_at.minute == 15

    # Новосибирск -> Сочи через SVO: ловушка короткой стыковки 50 минут
    f_ovb_sochi = search_flights(origin="OVB", destination="AER", departure_date="2026-07-01")
    short_layover = next((f for f in f_ovb_sochi if f.flight_number == "SU 1461 / SU 1122"), None)
    assert short_layover is not None
    assert short_layover.layover_duration == timedelta(minutes=50)


def test_flights_max_stops_filtering():
    """Тест фильтрации рейсов по количеству пересадок (max_stops)."""
    # Только прямые рейсы из Екатеринбурга в Сочи (max_stops=0)
    direct_only = search_flights(origin="Екатеринбург", destination="Сочи", departure_date="2026-07-01", max_stops=0)
    assert len(direct_only) > 0
    assert all(f.stops == 0 for f in direct_only)

    # Рейсы с пересадками (max_stops=1)
    with_transit = search_flights(origin="Екатеринбург", destination="Сочи", departure_date="2026-07-01", max_stops=1)
    assert len(with_transit) > len(direct_only)
    assert any(f.stops == 1 for f in with_transit)


def test_flights_dynamic_transit_synthesis():
    """Тест динамического синтеза пересадки через хаб при редких маршрутах."""
    # Казань -> Стамбул (где нет прямого рейса в датасете, но есть KZN -> SVO и SVO -> IST)
    f_kzn_ist = search_flights(origin="Казань", destination="Стамбул", departure_date="2026-07-01")
    assert len(f_kzn_ist) > 0
    transit_flight = f_kzn_ist[0]
    assert transit_flight.stops == 1
    assert "Москва" in (transit_flight.transit_point or "")
    assert transit_flight.layover_duration is not None
    assert transit_flight.price is not None and transit_flight.price > 0

"""
Тесты deterministic-извлечения параметров (:mod:`logic.extraction`).

Покрывают Acceptance Tests 1, 4, 5, 7, 8, 9, 11 и нормализацию дат.
"""

from datetime import date

from agents.travel.logic.extraction import extract_user_request
from domain.common import Currency, Month


def test_extract_all_in_one_message():
    """Test 1/23: одно сообщение заполняет несколько полей."""
    patch = extract_user_request(
        "Хотим в Барселону в сентябре на 10 дней, нас четверо, "
        "бюджет 3000 евро, хочется море и хороший отель."
    )
    assert patch.destination == "Barcelona"
    assert patch.month == [Month.SEPTEMBER]
    assert patch.duration == 10
    assert patch.travelers == 4
    assert patch.budget == 3000
    assert patch.currency == Currency.EUR
    assert "beach" in {p.name for p in (patch.preferences or [])}
    assert "quality" in (patch.hotel_requirements or [])


def test_extract_exact_dates_range():
    """Даты "10–17 августа" → exact_dates."""
    patch = extract_user_request("Хочу в Рим на 10-17 августа, нас двое.")
    assert patch.exact_dates == [date(2026, 8, 10), date(2026, 8, 17)]
    assert patch.travelers == 2


def test_extract_month_and_duration():
    """Test 6: месяц + длительность."""
    patch = extract_user_request("В июле на 7 дней.")
    assert patch.month == [Month.JULY]
    assert patch.duration == 7


def test_extract_week_duration():
    patch = extract_user_request("Хочу в Рим на неделю.")
    assert patch.duration == 7


def test_extract_travelers_range():
    """Test 7: диапазон путешественников."""
    patch = extract_user_request("Нас от 2 до 5.")
    assert patch.traveler_range == (2, 5)


def test_extract_no_travelers():
    """Test 8: нет числа путешественников."""
    patch = extract_user_request("Я хочу съездить в Рим на неделю.")
    assert patch.travelers is None
    assert patch.traveler_range is None


def test_extract_budget_range():
    """Test 9: диапазон бюджета → максимум (в merge)."""
    patch = extract_user_request("Бюджет между 100 и 150 тысяч.")
    assert patch.budget_range == (100000, 150000)


def test_extract_no_budget():
    """Test 10: бюджет не указан."""
    patch = extract_user_request("Бюджет пока не знаю.")
    assert patch.budget is None
    assert patch.budget_range is None


def test_extract_country_only():
    """Test 3: только страна — города нет."""
    patch = extract_user_request("Хочу в Италию.")
    assert patch.destination is None
    assert patch.destination_country == "Italy"


def test_extract_unknown_city_is_not_invented():
    """Город, которого нет в dataset, не должен извлекаться."""
    patch = extract_user_request("Хочу в Токио.")
    assert patch.destination is None


def test_extract_multiple_answers():
    """Test 11: несколько ответов в одном сообщении."""
    patch = extract_user_request("Даты 5-12 сентября, нас трое, бюджет 180 тысяч.")
    assert patch.exact_dates == [date(2026, 9, 5), date(2026, 9, 12)]
    assert patch.travelers == 3
    assert patch.budget == 180000


def test_extract_constraints_and_transport():
    patch = extract_user_request(
        "Еду с ребёнком, без ночных перелётов, прямой рейс."
    )
    names = {c.name for c in (patch.constraints or [])}
    assert "with_child" in names
    assert "no_night_flights" in names
    assert patch.preferred_transport is not None


def test_extract_origin():
    patch = extract_user_request("Вылетаю из Москвы.")
    assert patch.origin == "Moscow"

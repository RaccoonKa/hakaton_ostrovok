"""
Тесты deterministic-извлечения параметров (:mod:`logic.extraction`).

Покрывают Acceptance Tests раздела 11 (A/C/E) и правила извлечения
путешественников, бюджета, предпочтений и дат.
"""

from datetime import date

import pytest

from agents.travel.logic.extraction import extract_user_request
from domain.common import Currency, Month


def _ex(text: str):
    # Фиксированный год делает даты без года детерминированными в тестах.
    return extract_user_request(text, reference_year=2026)


def test_extract_all_in_one_message():
    patch = _ex(
        "Хотим в Сочи в сентябре на 10 дней, нас четверо, "
        "бюджет 3000 евро, хочется море и хороший отель."
    )
    assert patch.destination == "Сочи"
    assert patch.month == [Month.SEPTEMBER]
    assert patch.duration == 10
    assert patch.travelers == 4
    assert patch.budget == 3000
    assert patch.currency == Currency.EUR
    assert patch.budget_mode == "specified"
    assert "beach" in {p.name for p in (patch.preferences or [])}
    assert "quality" in (patch.hotel_requirements or [])


def test_extract_exact_dates_range():
    patch = _ex("Хочу в Сочи на 10-17 августа, нас двое.")
    assert patch.exact_dates == [date(2026, 8, 10), date(2026, 8, 17)]
    assert patch.travelers == 2


def test_extract_multiple_values_one_message():
    """Acceptance 13: даты, двое путешественников и бюджет одновременно."""
    patch = _ex("10–17 августа, нас двое, бюджет 150 тысяч")
    assert patch.exact_dates == [date(2026, 8, 10), date(2026, 8, 17)]
    assert patch.travelers == 2
    assert patch.budget == 150000


def test_extract_month_and_duration():
    patch = _ex("В июле на 7 дней.")
    assert patch.month == [Month.JULY]
    assert patch.duration == 7


def test_extract_week_duration():
    patch = _ex("Хочу в Сочи на неделю.")
    assert patch.duration == 7


def test_extract_travelers_range():
    patch = _ex("Нас от 2 до 5.")
    assert patch.traveler_range == (2, 5)


def test_extract_no_travelers():
    patch = _ex("Я хочу съездить в Сочи на неделю.")
    assert patch.travelers is None
    assert patch.traveler_range is None


def test_extract_budget_range_is_preserved():
    patch = _ex("Бюджет между 100 и 150 тысяч.")
    assert patch.budget_range == (100000, 150000)
    assert patch.budget is None
    assert patch.budget_mode == "specified"


@pytest.mark.parametrize(
    ("phrase", "expected"),
    [
        ("Я полечу один", 1),
        ("Нас двое", 2),
        ("Мы полетим вдвоём", 2),
        ("Мы полетим вдвоем", 2),
        ("Нас будет пятеро", 5),
        ("Хочу полететь с девушкой", 2),
        ("Поеду с женой и ребёнком", 3),
        ("Нас трое взрослых и один ребёнок", 4),
    ],
)
def test_extract_travelers_natural_language(phrase, expected):
    """Acceptance 11: разговорные формы и сопровождающие."""
    patch = _ex(phrase)
    assert patch.travelers == expected


def test_extract_child_breakdown_and_constraint():
    patch = _ex("Нас трое взрослых и один ребёнок")
    assert (patch.adults, patch.children) == (3, 1)
    assert "with_child" in {c.name for c in (patch.constraints or [])}


def test_extract_companion_who_stays_home_is_not_counted():
    """Acceptance 12: отрицание не увеличивает число путешественников."""
    patch = _ex("С девушкой не полечу, она останется дома")
    assert patch.travelers is None
    assert patch.traveler_range is None


def test_extract_budget_modes():
    assert _ex("Бюджет не важен").budget_mode == "no_limit"
    unknown = _ex("Бюджет пока не знаю, покажи варианты по стоимости")
    assert unknown.budget_mode == "flexible_scenarios"
    assert unknown.budget is None
    assert _ex("Бюджет 3000 евро").budget_mode == "specified"


def test_extract_no_preference_status():
    patch = _ex("мне всё равно, предложи варианты")
    assert patch.preference_status == "no_preference"
    assert patch.preferences is None


def test_extract_preferences_status_specified():
    patch = _ex("Люблю историю и архитектуру")
    assert patch.preference_status == "specified"
    assert {p.name for p in (patch.preferences or [])} == {"history", "architecture"}


def test_extract_preference_replacement_and_removal():
    patch = _ex("не пляж, а история")
    assert "history" in {p.name for p in (patch.preferences or [])}
    assert "beach" in (patch.removed_preferences or [])

    hotel = _ex("бассейн больше не нужен")
    assert "pool" in (hotel.removed_hotel_requirements or [])
    assert "pool" not in (hotel.hotel_requirements or [])


def test_extract_country_only():
    patch = _ex("Хочу в Турцию.")
    assert patch.destination is None
    assert patch.destination_country == "Турция"


def test_extract_unknown_city_is_marked_not_invented():
    patch = _ex("Хочу в Токио.")
    assert patch.destination == "Токио"


def test_extract_multiple_cities_is_ambiguous():
    """Несколько городов без выбора — направление не выбрано."""
    patch = _ex("Хочу в Сочи или Стамбул")
    assert patch.destination is None
    assert patch.destination_ambiguous is True


def test_extract_origin():
    patch = _ex("Вылетаю из Москвы.")
    assert patch.origin == "Москва"


def test_extract_constraints_and_transport():
    patch = _ex("Еду с ребёнком, без ночных перелётов, прямой рейс.")
    names = {c.name for c in (patch.constraints or [])}
    assert "with_child" in names
    assert "no_night_flights" in names
    assert patch.preferred_transport is not None


def test_extract_ignores_past_explicit_year():
    patch = _ex("Хочу в Сочи на 2024-08-10 .. 2024-08-17")
    assert patch.exact_dates is None


def test_extract_does_not_treat_city_number_as_preference():
    patch = _ex("город 2")
    assert patch.preferences is None

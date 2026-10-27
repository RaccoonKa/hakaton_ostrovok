"""
Тесты слияния запроса и deterministic-проверки готовности.

Покрывают Acceptance Tests 2, 3, 4, 5, 12, 13, 14 и правила
travelers/budget.
"""

from datetime import date

from agents.travel.logic.decision import (
    DEFAULT_BUDGET_SCENARIOS,
    merge_user_request,
    validate_travel_request,
)
from domain.common import Currency, Month
from domain.planning import UserRequestPatch
from domain.preference import Preference
from domain.request import UserRequest


def test_merge_preserves_previous_values():
    """Test: ранее полученные данные не теряются."""
    current = UserRequest(destination="Antalya", travelers=2, budget=150000)
    patch = UserRequestPatch(exact_dates=[date(2026, 7, 10), date(2026, 7, 17)])
    merged = merge_user_request(current, patch)
    assert merged.destination == "Antalya"
    assert merged.travelers == 2
    assert merged.budget == 150000
    assert merged.date_preferences.exact_dates == [date(2026, 7, 10), date(2026, 7, 17)]


def test_merge_updates_changed_values():
    """Test 12: изменение ранее указанных параметров."""
    current = UserRequest(destination="Paris", travelers=2)
    patch = UserRequestPatch(destination="Rome", travelers=3)
    merged = merge_user_request(current, patch)
    assert merged.destination == "Rome"
    assert merged.travelers == 3


def test_merge_none_does_not_erase():
    current = UserRequest(destination="Rome", travelers=2, budget=100000)
    merged = merge_user_request(current, UserRequestPatch(origin="Moscow"))
    assert merged.destination == "Rome"
    assert merged.travelers == 2
    assert merged.budget == 100000


def test_merge_traveler_range_uses_max():
    merged = merge_user_request(None, UserRequestPatch(traveler_range=(2, 5)))
    assert merged.travelers == 5


def test_merge_budget_range_uses_max():
    merged = merge_user_request(None, UserRequestPatch(budget_range=(100000, 150000)))
    assert merged.budget == 150000


def test_merge_preferences_dedup():
    current = UserRequest(preferences=[Preference(name="beach")])
    merged = merge_user_request(current, UserRequestPatch(preferences=[Preference(name="beach"), Preference(name="history")]))
    names = [p.name for p in merged.preferences]
    assert names.count("beach") == 1
    assert "history" in names


def test_validate_no_destination_asks_grouped():
    """Test 2/5: нет destination → сгруппированные вопросы."""
    request = UserRequest(origin="Moscow")
    result = validate_travel_request(request)
    assert result.ready is False
    assert "destination" in result.missing
    # Вопросы объединены (несколько).
    assert len(result.questions) >= 2


def test_validate_country_without_city_requires_selection():
    """Test 3: только страна → нужен выбор города."""
    request = UserRequest(origin="Moscow", destination_country="Italy")
    result = validate_travel_request(request, destination_selected=False)
    assert result.ready is False
    assert "destination_selection" in result.decisions_required


def test_validate_ready_when_complete():
    """Test 1/13: полный запрос готов, constraints не обязательны."""
    request = UserRequest(
        origin="Moscow",
        destination="Rome",
        travelers=2,
        budget=200000,
    )
    request.date_preferences.exact_dates = [date(2026, 8, 10), date(2026, 8, 17)]
    result = validate_travel_request(request, destination_selected=True)
    assert result.ready is True
    assert result.missing == []


def test_validate_month_duration_requires_date_selection():
    """Test 6: месяц + duration → нужен выбор периода."""
    request = UserRequest(origin="Moscow", destination="Rome", duration=7, travelers=2, budget=150000)
    request.date_preferences.month = [Month.JULY]
    result = validate_travel_request(request, destination_selected=True)
    assert result.ready is False
    assert "date_selection" in result.decisions_required


def test_validate_budget_scenarios_when_missing():
    """Test 10: нет бюджета → несколько сценариев, но это не блокирует."""
    request = UserRequest(origin="Moscow", destination="Rome", travelers=2)
    request.date_preferences.exact_dates = [date(2026, 8, 10), date(2026, 8, 17)]
    result = validate_travel_request(request, destination_selected=True)
    assert result.budget_scenarios == list(DEFAULT_BUDGET_SCENARIOS.values())
    assert result.ready is True  # отсутствие бюджета не блокирует


def test_validate_unknown_destination_marked():
    request = UserRequest(origin="Moscow", destination="Tokyo")
    request.date_preferences.exact_dates = [date(2026, 8, 10), date(2026, 8, 17)]
    result = validate_travel_request(request)
    assert result.ready is False
    assert "destination_unknown" in result.missing


def test_validate_currency_eur_ready():
    request = UserRequest(
        origin="Moscow", destination="Barcelona", travelers=4, budget=3000, currency=Currency.EUR
    )
    request.date_preferences.exact_dates = [date(2026, 9, 5), date(2026, 9, 12)]
    result = validate_travel_request(request, destination_selected=True)
    assert result.ready is True

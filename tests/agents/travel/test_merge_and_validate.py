"""
Тесты слияния запроса, deterministic-проверки готовности и разбора выбора.

Покрывают Acceptance Tests раздела 11 (B, D, E, F, G).
"""

from datetime import date

from agents.travel.logic.decision import (
    PREFERENCE_QUESTION,
    merge_user_request,
    resolve_selections,
    validate_travel_request,
)
from domain.common import Currency, Month
from domain.planning import DateRange, DestinationCandidate, UserRequestPatch
from domain.preference import Preference
from domain.request import UserRequest


def _complete(**overrides) -> UserRequest:
    data = dict(
        origin="Москва",
        destination="Сочи",
        travelers=2,
        travelers_provided=True,
        budget=200000,
        budget_mode="specified",
        preference_status="no_preference",
    )
    data.update(overrides)
    request = UserRequest(**data)
    request.date_preferences.exact_dates = [date(2027, 8, 10), date(2027, 8, 17)]
    return request


# --------------------------------------------------------------------------
# Merge
# --------------------------------------------------------------------------
def test_merge_preserves_previous_values():
    current = UserRequest(destination="Antalya", travelers=2, budget=150000)
    patch = UserRequestPatch(exact_dates=[date(2027, 7, 10), date(2027, 7, 17)])
    merged = merge_user_request(current, patch)
    assert merged.destination == "Antalya"
    assert merged.travelers == 2
    assert merged.budget == 150000
    assert merged.date_preferences.exact_dates == [date(2027, 7, 10), date(2027, 7, 17)]


def test_merge_updates_changed_values_only():
    current = UserRequest(destination="Paris", travelers=2, travelers_provided=True)
    merged = merge_user_request(current, UserRequestPatch(travelers=3))
    assert merged.destination == "Paris"
    assert merged.travelers == 3
    assert merged.travelers_provided is True


def test_merge_none_does_not_erase():
    current = UserRequest(
        destination="Rome",
        travelers=2,
        travelers_provided=True,
        budget=100000,
        budget_mode="specified",
    )
    merged = merge_user_request(current, UserRequestPatch(origin="Moscow"))
    assert merged.destination == "Rome"
    assert merged.travelers == 2
    assert merged.travelers_provided is True
    assert merged.budget == 100000
    assert merged.budget_mode == "specified"


def test_merge_traveler_range_uses_max_and_marks_provided():
    merged = merge_user_request(None, UserRequestPatch(traveler_range=(2, 5)))
    assert merged.travelers == 5
    assert merged.traveler_range == (2, 5)
    assert merged.travelers_provided is True


def test_merge_budget_range_is_preserved_not_collapsed():
    """Acceptance 23: диапазон не превращается в точную сумму."""
    merged = merge_user_request(None, UserRequestPatch(budget_range=(100000, 150000)))
    assert merged.budget_range == (100000, 150000)
    assert merged.budget is None
    assert merged.budget_mode == "specified"


def test_merge_exact_budget_replaces_range():
    current = UserRequest(budget_range=(100000, 150000), budget_mode="specified")
    merged = merge_user_request(current, UserRequestPatch(budget=120000))
    assert merged.budget == 120000
    assert merged.budget_range is None


def test_merge_preferences_dedup_and_removal():
    current = UserRequest(
        preferences=[Preference(name="beach"), Preference(name="history")]
    )
    merged = merge_user_request(
        current,
        UserRequestPatch(
            preferences=[Preference(name="beach"), Preference(name="nature")],
            removed_preferences=["beach"],
        ),
    )
    names = {p.name for p in merged.preferences}
    assert names == {"history", "nature"}


def test_merge_hotel_requirement_removal():
    current = UserRequest(hotel_requirements=["pool", "breakfast"])
    merged = merge_user_request(
        current, UserRequestPatch(removed_hotel_requirements=["pool"])
    )
    assert merged.hotel_requirements == ["breakfast"]


def test_merge_budget_modes():
    assert merge_user_request(None, UserRequestPatch(budget_mode="no_limit")).budget_mode == "no_limit"
    assert (
        merge_user_request(None, UserRequestPatch(budget_mode="flexible_scenarios")).budget_mode
        == "flexible_scenarios"
    )


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------
def test_validate_first_stage_is_only_vibe():
    """Acceptance 1/2: пока предпочтения не обработаны — только вопрос о вайбе."""
    request = UserRequest(origin="Moscow", duration=7, travelers=2, travelers_provided=True)
    request.date_preferences.month = [Month.AUGUST]
    result = validate_travel_request(request)
    assert result.stage == "preferences"
    assert result.ready_for_confirmation is False
    assert result.questions == [PREFERENCE_QUESTION]


def test_validate_no_preference_moves_to_destination():
    request = UserRequest(origin="Moscow", preference_status="no_preference")
    result = validate_travel_request(request)
    assert result.stage == "destination"
    assert "destination_selection" in result.decisions_required
    assert result.questions != [PREFERENCE_QUESTION]


def test_validate_ambiguous_destinations_require_one_choice():
    request = UserRequest(origin="Moscow", destination_ambiguous=True)
    result = validate_travel_request(request)
    assert result.stage == "destination"
    assert "destination_selection" in result.decisions_required


def test_validate_country_without_city_requires_selection():
    request = UserRequest(
        origin="Moscow",
        destination_country="Italy",
        preferences=[Preference(name="history")],
    )
    result = validate_travel_request(request, destination_selected=False)
    assert result.ready_for_confirmation is False
    assert "destination_selection" in result.decisions_required


def test_validate_complete_requires_confirmation():
    """Acceptance 28: собранные данные дают сверку, но не поиск."""
    result = validate_travel_request(_complete(), destination_selected=True)
    assert result.ready_for_confirmation is True
    assert result.ready_for_search is False
    assert result.ready is False
    assert result.stage == "confirmation"


def test_validate_confirmed_allows_search():
    """Acceptance 30: поиск только после подтверждения."""
    result = validate_travel_request(
        _complete(), destination_selected=True, request_confirmed=True
    )
    assert result.ready_for_confirmation is True
    assert result.ready_for_search is True
    assert result.ready is True


def test_validate_month_duration_requires_date_selection():
    request = _complete()
    request.date_preferences.exact_dates = None
    request.date_preferences.month = [Month.JULY]
    request.duration = 7
    result = validate_travel_request(request, destination_selected=True)
    assert result.ready_for_confirmation is False
    assert "date_selection" in result.decisions_required


def test_validate_unknown_budget_blocks():
    """Acceptance 21: бюджет unknown блокирует поиск."""
    request = _complete(budget=None, budget_mode="unknown")
    result = validate_travel_request(request, destination_selected=True, request_confirmed=True)
    assert result.ready_for_confirmation is False
    assert "budget" in result.missing


def test_validate_budget_no_limit_and_flexible_are_ready():
    for mode in ("no_limit", "flexible_scenarios"):
        request = _complete(budget=None, budget_mode=mode)
        result = validate_travel_request(request, destination_selected=True)
        assert result.ready_for_confirmation is True, mode


def test_validate_travelers_must_be_explicit():
    """Acceptance 14: значение по умолчанию 1 не доказывает ответ."""
    request = _complete(travelers=1, travelers_provided=False)
    result = validate_travel_request(request, destination_selected=True)
    assert result.ready_for_confirmation is False
    assert "travelers" in result.missing


def test_validate_uses_travelers_provided_argument():
    """Acceptance 35: validator получает и использует флаг travelers_provided."""
    request = _complete(travelers=2, travelers_provided=False)
    assert (
        validate_travel_request(
            request, destination_selected=True, travelers_provided=True
        ).ready_for_confirmation
        is True
    )
    assert (
        validate_travel_request(
            request, destination_selected=True, travelers_provided=False
        ).ready_for_confirmation
        is False
    )


def test_validate_unknown_destination_marked():
    request = _complete(destination="Tokyo")
    result = validate_travel_request(request, destination_selected=True)
    assert result.ready_for_confirmation is False
    assert "destination_unknown" in result.missing


def test_validate_explicit_city_does_not_require_preferences():
    """Acceptance 5: при явном городе предпочтения необязательны."""
    request = _complete(preference_status="unknown", preferences=[])
    result = validate_travel_request(request, destination_selected=True)
    assert result.ready_for_confirmation is True


def test_validate_currency_eur_ready():
    request = _complete(budget=3000, currency=Currency.EUR, travelers=4)
    result = validate_travel_request(request, destination_selected=True)
    assert result.ready_for_confirmation is True


# --------------------------------------------------------------------------
# Selection
# --------------------------------------------------------------------------
CANDIDATES = [
    DestinationCandidate(city="Rome", country="Italy"),
    DestinationCandidate(city="Paris", country="France"),
    DestinationCandidate(city="Prague", country="Czechia"),
]
DATES = [
    DateRange(start_date=date(2027, 8, 5), end_date=date(2027, 8, 12)),
    DateRange(start_date=date(2027, 8, 12), end_date=date(2027, 8, 19)),
]


def test_resolve_no_city_from_travelers_phrase():
    """Acceptance 15: «нас двое» не выбирает второй город."""
    city, date_range = resolve_selections("нас двое", CANDIDATES, [])
    assert city is None
    assert date_range is None


def test_resolve_city_by_ordinal():
    city, _ = resolve_selections("второй", CANDIDATES, [])
    assert city == "Paris"


def test_resolve_city_and_date_together():
    city, date_range = resolve_selections("город 2, даты 1", CANDIDATES, DATES)
    assert city == "Paris"
    assert date_range == DATES[0]

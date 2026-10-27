"""
Тесты travel tools и mock dataset.

Покрывают предложения городов/периодов, aggregator guard, валюту бюджета
и дедупликацию пакетов.
"""

import json

import pytest

from agents.travel.logic.decision import (
    dedupe_trip_options,
    suggest_date_ranges,
    suggest_destinations,
    trip_option_key,
)
from agents.travel.tools import mock_dataset as ds
from agents.travel.tools.destinations import search_destinations, suggest_destinations_tool
from agents.travel.tools.packaging import (
    AggregatorNotReadyError,
    assert_aggregator_ready,
    search_and_package_trip,
)
from domain.common import Month
from domain.request import UserRequest


def _search(**overrides):
    payload = {
        "origin": "Moscow",
        "destination": "Rome",
        "departure_date": "2027-08-10",
        "return_date": "2027-08-17",
        "passengers": 2,
    }
    payload.update(overrides)
    return search_and_package_trip.invoke(payload)


def test_dataset_has_at_least_10_cities():
    assert len(ds.DESTINATIONS) >= 10


def test_every_city_has_hotels_and_flights():
    for dest in ds.DESTINATIONS:
        assert len(ds.HOTELS[dest.city]) >= 3
        assert len(ds.FLIGHTS[dest.city]) >= 2


def test_cities_share_vibes():
    history_cities = [d.city for d in ds.DESTINATIONS if "history" in d.vibes]
    beach_cities = [d.city for d in ds.DESTINATIONS if "beach" in d.vibes]
    assert len(history_cities) >= 2
    assert len(beach_cities) >= 2


def test_price_levels_variety():
    levels = {d.price_level.value for d in ds.DESTINATIONS}
    assert {"budget", "medium", "premium"}.issubset(levels)


def test_search_destinations_known():
    result = json.loads(search_destinations.invoke({"query": "Рим"}))
    assert result["known"] is True
    assert result["city"] == "Rome"
    assert result["iata"] == "FCO"


def test_search_destinations_unknown_is_not_invented():
    result = json.loads(search_destinations.invoke({"query": "Москва"}))
    assert result["known"] is False


def test_search_destinations_country_returns_cities():
    result = json.loads(search_destinations.invoke({"query": "Италия"}))
    assert result["known"] is False
    assert "Rome" in result["cities"]


def test_suggest_destinations_by_country():
    req = UserRequest(destination_country="Italy")
    candidates = suggest_destinations(req, country="Italy")
    cities = {c.city for c in candidates}
    assert cities.issubset({"Rome", "Milan", "Florence", "Venice"})
    assert len(candidates) >= 1


def test_suggest_destinations_by_preferences():
    from domain.preference import Preference

    req = UserRequest(preferences=[Preference(name="beach"), Preference(name="warm_weather")])
    candidates = suggest_destinations(req)
    assert len(candidates) == 3
    for c in candidates:
        dest = ds.get_destination_by_city(c.city)
        assert dest is not None
        assert "beach" in dest.vibes


def test_suggest_destinations_contrastive_when_no_signals():
    candidates = suggest_destinations(None)
    assert len(candidates) >= 3


def test_suggest_destinations_tool_serializes():
    raw = suggest_destinations_tool.invoke({"preferences": "beach", "month": "july"})
    data = json.loads(raw)
    assert isinstance(data, list)
    assert all("city" in c for c in data)


def test_suggest_date_ranges_from_month_duration():
    req = UserRequest(duration=7)
    req.date_preferences.month = [Month.JULY]
    ranges = suggest_date_ranges(req, year=2027)
    assert 2 <= len(ranges) <= 3
    for r in ranges:
        assert r.start_date.month == 7
        assert r.nights == 7


def test_aggregator_guard_rejects_missing_destination():
    with pytest.raises(AggregatorNotReadyError):
        assert_aggregator_ready("Moscow", None, "2027-07-10", 2)


def test_aggregator_guard_rejects_unknown_destination():
    with pytest.raises(AggregatorNotReadyError):
        assert_aggregator_ready("Moscow", "Tokyo", "2027-07-10", 2)


def test_aggregator_tool_raises_on_unknown():
    with pytest.raises(AggregatorNotReadyError):
        _search(destination="Tokyo")


def test_aggregator_builds_three_packages():
    packages = _search(budget_limit=200000)
    assert len(packages) == 3
    assert [p["package_type"] for p in packages] == ["Эконом", "Оптимальный", "Комфорт"]
    assert all("grand_total" in p for p in packages)
    assert all("is_within_budget" in p for p in packages)
    # Идентификаторы нужны для стабильной дедупликации.
    assert all(p["flight"]["offer_id"] for p in packages)
    assert all(p["hotel"]["hotel_id"] for p in packages)


def test_aggregator_budget_shortfall_marks_over():
    packages = _search(budget_limit=1000)
    assert all(p["is_within_budget"] is False for p in packages)


def test_aggregator_currency_is_not_treated_as_rub():
    """Acceptance 27: 2000 EUR не равно 2000 RUB."""
    eur = _search(budget_limit=2000, currency="EUR")
    rub = _search(budget_limit=2000, currency="RUB")
    assert all(p["is_within_budget"] is True for p in eur)
    assert all(p["is_within_budget"] is False for p in rub)


def test_aggregator_range_upper_bound_is_limit():
    packages = _search(budget_limit=150000)
    comfort = next(p for p in packages if p["package_type"] == "Комфорт")
    assert comfort["is_within_budget"] is False


def test_dedupe_removes_identical_packages():
    packages = _search(budget_limit=200000)
    doubled = packages + [dict(p) for p in packages]
    deduped = dedupe_trip_options(doubled)
    assert len(deduped) == 3
    assert len({trip_option_key(p) for p in deduped}) == 3

"""
Адаптер для реального dataset (destinations.json).
Связывает новые JSON-файлы со строгими Pydantic-схемами проекта.
"""

from __future__ import annotations

import json
from pathlib import Path

from domain.common import Currency
from domain.planning import Destination, PriceLevel


def _get_data_dir() -> Path:
    return Path(__file__).resolve().parent.parent.parent.parent.parent / "data"

def load_destinations() -> list[dict]:
    file_path = _get_data_dir() / "destinations.json"
    if not file_path.exists():
        return []
    with open(file_path, encoding="utf-8") as f:
        return json.load(f)

# --- Детерминированные курсы валют ---
CURRENCY_TO_RUB: dict[str, float] = {
    "RUB": 1.0,
    "EUR": 100.0,
    "USD": 92.0,
    "TRY": 2.8,
}

def to_rub(amount: float, currency: Currency | str | None) -> float:
    if currency is None:
        return float(amount)
    key = currency.value if isinstance(currency, Currency) else str(currency)
    return float(amount) * CURRENCY_TO_RUB.get(key, 1.0)

# --- 1. Динамическая загрузка направлений из JSON ---
_raw_destinations = load_destinations()
DESTINATIONS: list[Destination] = []

for raw in _raw_destinations:
    # Простая эвристика для уровня цен на основе данных JSON
    eco_price = raw.get("estimated_budget_per_person", {}).get("economy", 50000)
    comfort_price = raw.get("estimated_budget_per_person", {}).get("comfort", 100000)
    pl = PriceLevel.MEDIUM
    if eco_price <= 30000:
        pl = PriceLevel.BUDGET
    elif comfort_price >= 150000:
        pl = PriceLevel.PREMIUM

    DESTINATIONS.append(Destination(
        city=raw["city"],
        country=raw["country"],
        iata=raw.get("hub_codes", [""])[0],
        vibes=raw.get("tags", []),
        suitable_for=["adults", "couples", "families"],
        seasons=[], # Можно мапить из best_months при необходимости
        price_level=pl
    ))

# --- 2. Точки отправления (Origins) ---
_ORIGIN_CITIES = {
    "Москва": "MOW",
    "Санкт-Петербург": "LED",
    "Екатеринбург": "SVX",
    "Казань": "KZN",
    "Новосибирск": "OVB",
    "Нижний Новгород": "GOJ",
}
ORIGINS: list[Destination] = [
    Destination(city=city, country="Россия", iata=iata, vibes=[], seasons=[], price_level=PriceLevel.MEDIUM)
    for city, iata in _ORIGIN_CITIES.items()
]

DEFAULT_ORIGIN = "Москва"

_BY_CITY: dict[str, Destination] = {d.city.lower(): d for d in DESTINATIONS}
_ORIGIN_BY_CITY: dict[str, Destination] = {o.city.lower(): o for o in ORIGINS}

# --- 3. Алиасы для распознавания русского текста (NLP) ---
CITY_ALIASES: dict[str, list[str]] = {
    "сочи": ["сочи", "адлер", "сириус", "красная поляна", "роза хутор"],
    "калининград": ["калининград", "клгд", "клд", "зеленоградск", "светлогорск", "янтарный"],
    "санкт-петербург": ["санкт-петербург", "питер", "спб", "петербург"],
    "стамбул": ["стамбул", "истанбул"],
    "анталья": ["анталья", "анталия"],
    "москва": ["москва", "мск"],
    "екатеринбург": ["екатеринбург", "екб", "кольцово"],
    "казань": ["казань", "казани"],
    "новосибирск": ["новосибирск", "новосиб", "толмачево", "толмачёво"],
    "нижний новгород": ["нижний новгород", "нижний", "горький"],
}

COUNTRY_ALIASES: dict[str, list[str]] = {
    "россия": ["россия", "россии", "россию", "росси", "рф"],
    "турция": ["турция", "турции", "турцию", "турци"],
}

def load_hotels() -> list[dict]:
    file_path = _get_data_dir() / "hotels.json"
    if not file_path.exists():
        return []
    with open(file_path, encoding="utf-8") as f:
        return json.load(f)

def load_flights() -> list[dict]:
    file_path = _get_data_dir() / "flights.json"
    if not file_path.exists():
        return []
    with open(file_path, encoding="utf-8") as f:
        return json.load(f)

_raw_hotels: list[dict] = load_hotels()
_raw_flights: list[dict] = load_flights()

def get_hotels_by_city(city: str) -> list[dict]:
    """Получить отели города из hotels.json."""
    if not city:
        return []
    needle = city.strip().lower()
    return [h for h in _raw_hotels if h.get("city", "").strip().lower() == needle]

def get_flights_by_route(origin: str, destination: str) -> list[dict]:
    """Получить авиарейсы по маршруту из flights.json."""
    if not origin or not destination:
        return []
    orig = origin.strip().lower()
    dest = destination.strip().lower()
    return [
        f for f in _raw_flights
        if f.get("origin_city", "").strip().lower() == orig
        and f.get("destination_city", "").strip().lower() == dest
    ]

# (Оставляем пустыми, т.к. агрегатор теперь читает JSON напрямую)
FLIGHTS: dict = {}
HOTELS: dict = {}


# --- Базовые lookup-хелперы (Интерфейс для extract.py и destinations.py) ---

def all_destinations() -> list[Destination]:
    return list(DESTINATIONS)

def get_destination_by_city(city: str) -> Destination | None:
    if not city:
        return None
    return _BY_CITY.get(city.strip().lower())

def get_destination_by_iata(iata: str) -> Destination | None:
    if not iata:
        return None
    needle = iata.strip().upper()
    for d in DESTINATIONS:
        if d.iata == needle:
            return d
    return None

def get_origin_by_city(city: str) -> Destination | None:
    if not city:
        return None
    return _ORIGIN_BY_CITY.get(city.strip().lower())

def known_origin_cities() -> list[str]:
    return [o.city for o in ORIGINS]

def resolve_city(text: str) -> Destination | None:
    if not text:
        return None
    lowered = text.strip().lower()
    if d := _BY_CITY.get(lowered):
        return d
    if d := _ORIGIN_BY_CITY.get(lowered):
        return d
    for d in DESTINATIONS:
        if d.city.lower() in lowered:
            return d
    for city_key, stems in CITY_ALIASES.items():
        for stem in stems:
            if stem in lowered:
                if d := _BY_CITY.get(city_key):
                    return d
                if d := _ORIGIN_BY_CITY.get(city_key):
                    return d
    return None

def resolve_country(text: str) -> str | None:
    if not text:
        return None
    lowered = text.strip().lower()
    for dest in DESTINATIONS:
        if dest.country.lower() in lowered:
            return dest.country
    for country_key, stems in COUNTRY_ALIASES.items():
        for stem in stems:
            if stem in lowered:
                for dest in DESTINATIONS:
                    if dest.country.lower() == country_key:
                        return dest.country
    return None

def cities_in_country(country: str) -> list[Destination]:
    target = country.strip().lower()
    return [d for d in DESTINATIONS if d.country.lower() == target]

def get_weather_info(city: str, month: int | None = None) -> dict | None:
    """Получить климатическую справку по городу и месяцу из destinations.json."""
    dest = get_destination_by_city(city)
    target_city = dest.city.lower() if dest else city.lower()

    for item in load_destinations():
        if item.get("city", "").lower() == target_city:
            weather = item.get("weather", {})
            seasonality = item.get("seasonality", "")
            best_months = item.get("best_months", [])
            monthly = weather.get("monthly", {})

            res = {
                "city": item.get("city"),
                "seasonality": seasonality,
                "best_months": best_months,
            }
            if month is not None:
                m_str = str(month)
                if m_str in monthly:
                    res["month"] = month
                    res["air_temp"] = monthly[m_str].get("air")
                    res["water_temp"] = monthly[m_str].get("water")

                if month in (12, 1, 2):
                    res["season_desc"] = weather.get("winter", {}).get("description")
                elif month in (3, 4, 5):
                    res["season_desc"] = weather.get("spring", {}).get("description")
                elif month in (6, 7, 8):
                    res["season_desc"] = weather.get("summer", {}).get("description")
                else:
                    res["season_desc"] = weather.get("autumn", {}).get("description")
            return res
    return None

__all__ = [
    "CITY_ALIASES",
    "COUNTRY_ALIASES",
    "CURRENCY_TO_RUB",
    "DESTINATIONS",
    "FLIGHTS",
    "HOTELS",
    "ORIGINS",
    "all_destinations",
    "cities_in_country",
    "get_flights_by_route",
    "get_hotels_by_city",
    "get_weather_info",
    "get_destination_by_city",
    "get_destination_by_iata",
    "get_origin_by_city",
    "known_origin_cities",
    "resolve_city",
    "resolve_country",
    "to_rub",
]
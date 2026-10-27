"""
Единый детерминированный mock dataset для travel-agent.

Этот модуль описывает **замкнутый тестовый мир**: все travel tools
(``search_destinations``, ``suggest_destinations``, ``suggest_date_ranges``,
``validate_travel_request``, ``search_and_package_trip``) используют
данные только отсюда.

Ключевой принцип: если сущности (город, отель, перелёт, цена) нет в этом
датасете, агент НЕ имеет права её выдумывать. Любые ответы формируются
исключительно из данных ниже.

Структура связана между собой::

    Destination (city)
        ↓
    FLIGHTS[city]  (перелёты в город)
        ↓
    HOTELS[city]   (отели в городе)
        ↓
    aggregator → TripOption

Все цены указаны в рублях (RUB). Для сравнения с бюджетом в другой валюте
используется детерминированный курс ``CURRENCY_TO_RUB``.
"""

from __future__ import annotations

from domain.common import Currency, MealPlan, Season
from domain.planning import Destination, PriceLevel

# --- Детерминированные курсы валют к рублю (тестовые, не реальные) ---------
CURRENCY_TO_RUB: dict[str, float] = {
    "RUB": 1.0,
    "EUR": 100.0,
    "USD": 92.0,
    "TRY": 2.8,
    "AED": 25.0,
    "GEL": 34.0,
    "THB": 2.6,
    "EGP": 1.9,
    "CNY": 12.7,
    "KZT": 0.19,
}


def to_rub(amount: float, currency: Currency | str | None) -> float:
    """Перевести сумму из валюты в рубли по фиксированному курсу."""
    if currency is None:
        return float(amount)
    key = currency.value if isinstance(currency, Currency) else str(currency)
    return float(amount) * CURRENCY_TO_RUB.get(key, 1.0)


# --- Конфигурация городов --------------------------------------------------
# city, country, iata, vibes, suitable_for, seasons, price_level,
# flight_base (руб/чел, туда-обратно), hotel_base (руб/ночь)
_CITY_CONFIG: list[dict] = [
    {
        "city": "Rome",
        "country": "Italy",
        "iata": "FCO",
        "vibes": ["history", "architecture", "culture", "food", "city"],
        "suitable_for": ["couples", "adults", "families"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.MEDIUM,
        "flight_base": 22000,
        "hotel_base": 9000,
        "airlines": ["Aeroflot", "ITA Airways", "Turkish Airlines"],
    },
    {
        "city": "Paris",
        "country": "France",
        "iata": "CDG",
        "vibes": ["history", "architecture", "romance", "culture", "food", "city"],
        "suitable_for": ["couples", "families", "adults"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.PREMIUM,
        "flight_base": 24000,
        "hotel_base": 11000,
        "airlines": ["Air France", "Aeroflot", "KLM"],
    },
    {
        "city": "Barcelona",
        "country": "Spain",
        "iata": "BCN",
        "vibes": ["beach", "city", "nightlife", "culture", "food"],
        "suitable_for": ["couples", "friends", "adults"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.MEDIUM,
        "flight_base": 23000,
        "hotel_base": 9000,
        "airlines": ["Iberia", "Vueling", "Aeroflot"],
    },
    {
        "city": "Prague",
        "country": "Czechia",
        "iata": "PRG",
        "vibes": ["history", "architecture", "culture", "city", "budget"],
        "suitable_for": ["couples", "adults", "families", "friends"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER],
        "price_level": PriceLevel.BUDGET,
        "flight_base": 14000,
        "hotel_base": 6000,
        "airlines": ["Czech Airlines", "Wizz Air", "Aeroflot"],
    },
    {
        "city": "Antalya",
        "country": "Turkey",
        "iata": "AYT",
        "vibes": ["beach", "sea", "family", "all_inclusive", "relax"],
        "suitable_for": ["families", "couples"],
        "seasons": [Season.SUMMER],
        "price_level": PriceLevel.MEDIUM,
        "flight_base": 18000,
        "hotel_base": 8000,
        "airlines": ["Turkish Airlines", "Pegasus", "Azur Air"],
    },
    {
        "city": "Lisbon",
        "country": "Portugal",
        "iata": "LIS",
        "vibes": ["beach", "city", "culture", "food", "nature"],
        "suitable_for": ["couples", "adults", "families"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.MEDIUM,
        "flight_base": 26000,
        "hotel_base": 9000,
        "airlines": ["TAP Air Portugal", "Aeroflot", "S7"],
    },
    {
        "city": "Reykjavik",
        "country": "Iceland",
        "iata": "KEF",
        "vibes": ["nature", "adventure", "northern_lights", "relax"],
        "suitable_for": ["couples", "adults", "friends"],
        "seasons": [Season.WINTER, Season.SPRING, Season.AUTUMN],
        "price_level": PriceLevel.PREMIUM,
        "flight_base": 42000,
        "hotel_base": 16000,
        "airlines": ["Icelandair", "Aeroflot", "Finnair"],
    },
    {
        "city": "Amsterdam",
        "country": "Netherlands",
        "iata": "AMS",
        "vibes": ["city", "culture", "nightlife", "architecture", "canals"],
        "suitable_for": ["adults", "couples", "friends"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.MEDIUM,
        "flight_base": 20000,
        "hotel_base": 10000,
        "airlines": ["KLM", "Aeroflot", "easyJet"],
    },
    {
        "city": "Venice",
        "country": "Italy",
        "iata": "VCE",
        "vibes": ["romance", "history", "architecture", "culture", "canals"],
        "suitable_for": ["couples"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.PREMIUM,
        "flight_base": 25000,
        "hotel_base": 13000,
        "airlines": ["ITA Airways", "Aeroflot", "Lufthansa"],
    },
    {
        "city": "Milan",
        "country": "Italy",
        "iata": "MXP",
        "vibes": ["city", "shopping", "culture", "architecture", "food"],
        "suitable_for": ["adults", "couples"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.PREMIUM,
        "flight_base": 21000,
        "hotel_base": 10000,
        "airlines": ["ITA Airways", "Aeroflot", "Emirates"],
    },
    {
        "city": "Florence",
        "country": "Italy",
        "iata": "FLR",
        "vibes": ["history", "architecture", "culture", "art", "food"],
        "suitable_for": ["couples", "adults", "families"],
        "seasons": [Season.SPRING, Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.MEDIUM,
        "flight_base": 22000,
        "hotel_base": 9500,
        "airlines": ["ITA Airways", "Aeroflot", "Swiss"],
    },
    {
        "city": "Dubai",
        "country": "UAE",
        "iata": "DXB",
        "vibes": ["beach", "luxury", "shopping", "city", "desert"],
        "suitable_for": ["families", "couples", "adults"],
        "seasons": [Season.WINTER, Season.SPRING, Season.AUTUMN],
        "price_level": PriceLevel.PREMIUM,
        "flight_base": 38000,
        "hotel_base": 14000,
        "airlines": ["Emirates", "Flydubai", "Aeroflot"],
    },
    {
        "city": "Bali",
        "country": "Indonesia",
        "iata": "DPS",
        "vibes": ["beach", "nature", "relax", "wellness", "adventure"],
        "suitable_for": ["couples", "adults", "friends"],
        "seasons": [Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.MEDIUM,
        "flight_base": 60000,
        "hotel_base": 9000,
        "airlines": ["Qatar Airways", "Emirates", "Singapore Airlines"],
    },
    {
        "city": "Paphos",
        "country": "Cyprus",
        "iata": "PFO",
        "vibes": ["beach", "sea", "history", "relax"],
        "suitable_for": ["families", "couples"],
        "seasons": [Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.BUDGET,
        "flight_base": 24000,
        "hotel_base": 8500,
        "airlines": ["Cyprus Airways", "Aeroflot", "Wizz Air"],
    },
    {
        "city": "Crete",
        "country": "Greece",
        "iata": "HER",
        "vibes": ["beach", "history", "nature", "family", "sea"],
        "suitable_for": ["families", "couples"],
        "seasons": [Season.SUMMER, Season.AUTUMN],
        "price_level": PriceLevel.MEDIUM,
        "flight_base": 26000,
        "hotel_base": 9000,
        "airlines": ["Aegean Airlines", "Aeroflot", "Ellinair"],
    },
]

# Города, которые могут быть точкой отправления (origin).
ORIGINS: list[Destination] = [
    Destination(city="Moscow", country="Russia", iata="MOW", vibes=["city"], seasons=[], price_level=PriceLevel.MEDIUM),
    Destination(city="Saint Petersburg", country="Russia", iata="LED", vibes=["city"], seasons=[], price_level=PriceLevel.MEDIUM),
    Destination(city="Amsterdam", country="Netherlands", iata="AMS", vibes=["city"], seasons=[], price_level=PriceLevel.MEDIUM),
]

DESTINATIONS: list[Destination] = [
    Destination(
        city=c["city"],
        country=c["country"],
        iata=c["iata"],
        vibes=list(c["vibes"]),
        suitable_for=list(c["suitable_for"]),
        seasons=list(c["seasons"]),
        price_level=c["price_level"],
    )
    for c in _CITY_CONFIG
]


def _build_flights(cfg: dict) -> list[dict]:
    """Сгенерировать 3 варианта перелёта для города (детерминированно)."""
    base = cfg["flight_base"]
    airlines = cfg["airlines"]
    return [
        {
            "offer_id": f"{cfg['iata']}-direct",
            "airline_name": airlines[0],
            "flight_number": f"{cfg['iata'][:2]}100",
            "departure_time": "09:30",
            "arrival_time": "12:00",
            "duration_minutes": 150,
            "transfers_count": 0,
            "price_per_person": float(base),
            "currency": Currency.RUB,
        },
        {
            "offer_id": f"{cfg['iata']}-cheap",
            "airline_name": airlines[2] if len(airlines) > 2 else airlines[1],
            "flight_number": f"{cfg['iata'][:2]}220",
            "departure_time": "06:05",
            "arrival_time": "11:25",
            "duration_minutes": 320,
            "transfers_count": 1,
            "price_per_person": float(round(base * 0.75)),
            "currency": Currency.RUB,
        },
        {
            "offer_id": f"{cfg['iata']}-comfort",
            "airline_name": airlines[1],
            "flight_number": f"{cfg['iata'][:2]}300",
            "departure_time": "18:40",
            "arrival_time": "21:10",
            "duration_minutes": 150,
            "transfers_count": 0,
            "price_per_person": float(round(base * 1.25)),
            "currency": Currency.RUB,
        },
    ]


def _build_hotels(cfg: dict) -> list[dict]:
    """Сгенерировать 3 отеля для города: эконом / комфорт / премиум."""
    base = cfg["hotel_base"]
    city = cfg["city"]
    return [
        {
            "hotel_id": f"{cfg['iata']}-h-budget",
            "name": f"{city} Budget Inn",
            "stars": 3,
            "rating": 7.2,
            "location": "outside_center",
            "price_per_night": float(round(base * 0.6)),
            "currency": Currency.RUB,
            "meal_plan": MealPlan.ROOM_ONLY,
            "amenities": ["Wi-Fi"],
            "hotel_requirements": ["budget"],
        },
        {
            "hotel_id": f"{cfg['iata']}-h-comfort",
            "name": f"{city} Central Hotel",
            "stars": 4,
            "rating": 8.5,
            "location": "center",
            "price_per_night": float(base),
            "currency": Currency.RUB,
            "meal_plan": MealPlan.BREAKFAST,
            "amenities": ["Wi-Fi", "Breakfast", "Pool"],
            "hotel_requirements": ["center", "breakfast", "pool"],
        },
        {
            "hotel_id": f"{cfg['iata']}-h-premium",
            "name": f"Grand {city} Resort & Spa",
            "stars": 5,
            "rating": 9.3,
            "location": "center",
            "price_per_night": float(round(base * 1.8)),
            "currency": Currency.RUB,
            "meal_plan": MealPlan.ALL_INCLUSIVE,
            "amenities": ["Wi-Fi", "Breakfast", "Pool", "Spa", "Sea view"],
            "hotel_requirements": ["center", "premium", "spa", "sea_view", "all_inclusive"],
        },
    ]


FLIGHTS: dict[str, list[dict]] = {
    cfg["city"]: _build_flights(cfg) for cfg in _CITY_CONFIG
}

HOTELS: dict[str, list[dict]] = {
    cfg["city"]: _build_hotels(cfg) for cfg in _CITY_CONFIG
}


# --- Базовые lookup-хелперы (без бизнес-логики подбора) ---------------------
_BY_CITY: dict[str, Destination] = {d.city.lower(): d for d in DESTINATIONS}
_ORIGIN_BY_CITY: dict[str, Destination] = {o.city.lower(): o for o in ORIGINS}

# Город вылета по умолчанию, если пользователь его не указал.
DEFAULT_ORIGIN = "Moscow"


def all_destinations() -> list[Destination]:
    """Все города, доступные как направления."""
    return list(DESTINATIONS)


def get_destination_by_city(city: str) -> Destination | None:
    """Найти направление по точному названию города (без учёта регистра)."""
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


# --- Русскоязычные алиасы (нужны для парсинга естественного языка) ---------
CITY_ALIASES: dict[str, list[str]] = {
    "rome": ["рим"],
    "paris": ["париж"],
    "barcelona": ["барселон"],
    "prague": ["праг"],
    "antalya": ["антали"],
    "lisbon": ["лиссабон"],
    "reykjavik": ["рейкьявик"],
    "amsterdam": ["амстердам"],
    "venice": ["венеци"],
    "milan": ["милан"],
    "florence": ["флоренци"],
    "dubai": ["дубай"],
    "bali": ["бали"],
    "paphos": ["пафос"],
    "crete": ["крит"],
    "moscow": ["москв"],
    "saint petersburg": ["петербург", "питер"],
}

COUNTRY_ALIASES: dict[str, list[str]] = {
    "italy": ["итал"],
    "france": ["франц"],
    "spain": ["испан"],
    "czechia": ["чех"],
    "turkey": ["турци"],
    "portugal": ["португал"],
    "iceland": ["исланд"],
    "netherlands": ["нидерланд", "голланд"],
    "uae": ["оаэ", "эмират"],
    "indonesia": ["индонез"],
    "cyprus": ["кипр"],
    "greece": ["грец"],
    "russia": ["росси", "росс"],
}


def resolve_city(text: str) -> Destination | None:
    """Разрешить город (в т.ч. русское склонение) в направление из dataset."""
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
    """Разрешить страну (в т.ч. русское склонение) в каноничное название."""
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
    """Все города dataset, находящиеся в указанной стране."""
    target = country.strip().lower()
    return [d for d in DESTINATIONS if d.country.lower() == target]


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
    "get_destination_by_city",
    "get_destination_by_iata",
    "get_origin_by_city",
    "known_origin_cities",
    "resolve_city",
    "resolve_country",
    "to_rub",
]

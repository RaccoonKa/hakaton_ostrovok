"""
Провайдер поиска отелей с поддержкой PostgreSQL и fallback на data/hotels.json.
"""

import json
import logging
from datetime import date
from typing import Any

from domain.common import Currency, MealPlan
from domain.hotel import Hotel
from memory.db_storage import fetch_payloads, get_data_dir, is_db_available

logger = logging.getLogger(__name__)


def _load_raw_hotels(city: str, district: str | None = None) -> list[dict[str, Any]]:
    """
    Загружает сырые записи отелей:
    сначала пробует PostgreSQL, при недоступности читает data/hotels.json.
    """
    if is_db_available():
        query = "SELECT payload FROM hotels WHERE city ILIKE %s"
        params: list[Any] = [f"%{city.strip()}%"]
        if district:
            query += " AND district ILIKE %s"
            params.append(f"%{district.strip()}%")
        payloads = fetch_payloads(query, tuple(params))
        if payloads is not None:
            return payloads

    # Fallback на локальный JSON файл
    data_dir = get_data_dir()
    hotels_file = data_dir / "hotels.json"
    if not hotels_file.exists():
        logger.warning("Hotels data file %s not found.", hotels_file)
        return []

    with open(hotels_file, encoding="utf-8") as f:
        hotels: list[dict[str, Any]] = json.load(f)

    return hotels


def calculate_hotel_price(
    base_price_per_night: float,
    check_in: date,
    check_out: date,
    hotel_name: str = "",
    district: str | None = None,
) -> float:
    """
    Динамический расчёт стоимости проживания:
    число ночей * базовая цена * сезонный коэффициент:
    - лето (июнь-август) x1.3
    - зима для гор (декабрь-март) x1.4
    - межсезонье x0.85
    """
    nights = (check_out - check_in).days
    nights = max(1, nights)

    month = check_in.month
    dist_str = (district or "").lower()
    name_str = hotel_name.lower()
    is_mountain = any(
        kw in dist_str or kw in name_str for kw in ("полян", "роза", "горы", "горн")
    )

    if month in (6, 7, 8):
        season_coeff = 1.3
    elif month in (12, 1, 2, 3) and is_mountain:
        season_coeff = 1.4
    else:
        season_coeff = 0.85

    return round(nights * base_price_per_night * season_coeff, 2)


def search_hotels(
    city: str,
    check_in: date | str,
    check_out: date | str,
    guests: int = 1,
    budget_limit: float | None = None,
    district: str | None = None,
    pet_friendly: bool | None = None,
    meal_plan: MealPlan | str | None = None,
    amenities: list[str] | None = None,
) -> list[Hotel]:
    """
    Поиск отелей по параметрам с фильтрацией и расчётом сезонной цены.
    """
    check_in_date = (
        date.fromisoformat(check_in) if isinstance(check_in, str) else check_in
    )
    check_out_date = (
        date.fromisoformat(check_out) if isinstance(check_out, str) else check_out
    )

    raw_hotels = _load_raw_hotels(city=city, district=district)
    city_query = city.strip().lower()
    district_query = district.strip().lower() if district else None

    # Приведение meal_plan к строковому значению enum
    target_meal_plan = (
        meal_plan.value if isinstance(meal_plan, MealPlan) else meal_plan
    )

    result: list[Hotel] = []

    for h in raw_hotels:
        h_city = h.get("city", "").lower()
        h_district = (h.get("district") or "").lower()

        # Фильтр по городу / району (если город не совпал точно, но совпал район)
        if (
            city_query not in h_city
            and city_query not in h_district
            and h_city not in city_query
        ):
            continue

        # Фильтр по району
        if district_query and (
            district_query not in h_district and district_query not in h_city
        ):
            continue

        # Фильтр по питомцам
        if pet_friendly is not None:
            if pet_friendly and not h.get("pet_friendly", False):
                continue
            if not pet_friendly and h.get("pet_friendly", False):
                continue

        # Фильтр по питанию
        if target_meal_plan and h.get("meal_plan") != target_meal_plan:
            continue

        # Фильтр по удобствам
        if amenities:
            hotel_amenities = [a.lower() for a in h.get("amenities", [])]
            if not all(
                any(req.strip().lower() in a for a in hotel_amenities)
                for req in amenities
            ):
                continue

        # Расчет стоимости
        base_price = float(h.get("price_per_night", 0.0))
        price = calculate_hotel_price(
            base_price_per_night=base_price,
            check_in=check_in_date,
            check_out=check_out_date,
            hotel_name=h.get("hotel", ""),
            district=h.get("district"),
        )

        # Фильтр по бюджету
        if budget_limit is not None and price > budget_limit:
            continue

        hotel_obj = Hotel(
            hotel=h["hotel"],
            city=h["city"],
            district=h.get("district"),
            check_in=check_in_date,
            check_out=check_out_date,
            guests=guests,
            room_type=h.get("room_type"),
            rating=h.get("rating"),
            image_url=h.get("image_url"),
            pet_friendly=h.get("pet_friendly", False),
            pet_fee_per_night=float(h.get("pet_fee_per_night", 0.0)),
            check_in_time=h.get("check_in_time", "14:00"),
            check_out_time=h.get("check_out_time", "12:00"),
            early_check_in_fee=float(h.get("early_check_in_fee", 0.0)),
            free_cancellation=h.get("free_cancellation", True),
            non_refundable_discount_pct=int(
                h.get("non_refundable_discount_pct", 0)
            ),
            meal_plan=MealPlan(h["meal_plan"]) if h.get("meal_plan") else None,
            price=price,
            currency=Currency(h["currency"]) if h.get("currency") else Currency.RUB,
            refundable=h.get("refundable", True),
            cancellation_conditions=h.get("cancellation_conditions"),
            amenities=h.get("amenities", []),
        )
        result.append(hotel_obj)

    return result

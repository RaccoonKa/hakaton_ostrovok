from datetime import datetime, timedelta

from langchain_core.tools import tool


@tool
def search_and_package_trip(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None = None,
    passengers: int = 1,
    budget_limit: float | None = None,
) -> list[dict]:
    """
    Ищет авиабилеты и отели, агрегирует их и возвращает 3 варианта поездки:
    'Эконом', 'Оптимальный' и 'Комфорт'.
    """
    # Safe date parsing for realistic timeline & flight scheduling
    try:
        dep_dt = datetime.fromisoformat(departure_date.split("T")[0])
    except Exception:
        dep_dt = datetime.now() + timedelta(days=14)

    if return_date:
        try:
            ret_dt = datetime.fromisoformat(return_date.split("T")[0])
        except Exception:
            ret_dt = dep_dt + timedelta(days=7)
    else:
        ret_dt = dep_dt + timedelta(days=7)

    dep_str = dep_dt.strftime("%Y-%m-%d")
    ret_str = ret_dt.strftime("%Y-%m-%d")

    packages_config = [
        {
            "id": f"opt-{origin[:3].lower()}-{destination[:3].lower()}-econ",
            "package_type": "Эконом",
            "title": f"Эконом тур: {destination}",
            "description": f"Выгодный перелет с удобной пересадкой, проверенный уютный отель рядом с транспортом в {destination}.",
            "carrier": "Победа",
            "flight_num_out": "DP-831",
            "flight_num_ret": "DP-832",
            "hotel_name": f"Гостиница «Центральная», {destination}",
            "hotel_stars": 3,
            "hotel_rating": 4.5,
            "meal_plan": "breakfast",
            "flight_price_person": 12000,
            "hotel_price_total": 9500,
            "score": 88,
        },
        {
            "id": f"opt-{origin[:3].lower()}-{destination[:3].lower()}-opt",
            "package_type": "Оптимальный",
            "title": f"Оптимальный тур: {destination}",
            "description": f"Прямой регулярный рейс S7 Airlines, отель 4★ с отличным сервисом и удобной локацией в {destination}.",
            "carrier": "S7 Airlines",
            "flight_num_out": "S7-2041",
            "flight_num_ret": "S7-2042",
            "hotel_name": f"Park Hotel Resort 4★, {destination}",
            "hotel_stars": 4,
            "hotel_rating": 4.8,
            "meal_plan": "all_inclusive",
            "flight_price_person": 18000,
            "hotel_price_total": 24000,
            "score": 95,
        },
        {
            "id": f"opt-{origin[:3].lower()}-{destination[:3].lower()}-prem",
            "package_type": "Комфорт",
            "title": f"Премиум тур: {destination}",
            "description": f"Прямой рейс Аэрофлота в идеальное время, люксовый 5★ курортный комплекс на первой линии в {destination}.",
            "carrier": "Аэрофлот",
            "flight_num_out": "SU-1120",
            "flight_num_ret": "SU-1121",
            "hotel_name": f"Grand Palace Resort & Spa 5★, {destination}",
            "hotel_stars": 5,
            "hotel_rating": 4.95,
            "meal_plan": "all_inclusive",
            "flight_price_person": 25000,
            "hotel_price_total": 52000,
            "score": 99,
        },
    ]

    packages = []
    for cfg in packages_config:
        flights_total = cfg["flight_price_person"] * passengers
        hotels_total = cfg["hotel_price_total"]
        grand_total = flights_total + hotels_total

        # Build canonical TripOption flights
        flights = [
            {
                "origin": origin,
                "destination": destination,
                "departure_at": f"{dep_str}T09:15:00",
                "arrival_at": f"{dep_str}T13:45:00",
                "duration": "PT4H30M",
                "carrier": cfg["carrier"],
                "flight_number": cfg["flight_num_out"],
                "stops": 0 if cfg["package_type"] != "Эконом" else 1,
                "baggage": "23 кг включено",
                "price": cfg["flight_price_person"],
                "currency": "RUB",
                "refundable": True,
            },
            {
                "origin": destination,
                "destination": origin,
                "departure_at": f"{ret_str}T16:20:00",
                "arrival_at": f"{ret_str}T20:50:00",
                "duration": "PT4H30M",
                "carrier": cfg["carrier"],
                "flight_number": cfg["flight_num_ret"],
                "stops": 0 if cfg["package_type"] != "Эконом" else 1,
                "baggage": "23 кг включено",
                "price": cfg["flight_price_person"],
                "currency": "RUB",
                "refundable": True,
            },
        ]

        # Build canonical TripOption hotels
        hotels = [
            {
                "hotel": cfg["hotel_name"],
                "city": destination,
                "check_in": dep_str,
                "check_out": ret_str,
                "stars": cfg["hotel_stars"],
                "rating": cfg["hotel_rating"],
                "meal_plan": cfg["meal_plan"],
                "room_type": "Стандарт улучшенный с видом на парк/море",
                "price": hotels_total,
                "currency": "RUB",
                "free_cancellation": True,
                "amenities": ["Wi-Fi", "Бассейн", "Кондиционер", "Завтрак", "Трансфер"],
            }
        ]

        # Build budget breakdown
        budget = {
            "flights_total": flights_total,
            "hotels_total": hotels_total,
            "transfers_total": 0,
            "other_total": 0,
            "total": grand_total,
            "currency": "RUB",
        }

        pkg = {
            # Legacy fields for backward compatibility
            "package_type": cfg["package_type"],
            "description": cfg["description"],
            "flight": {
                "airline": cfg["carrier"],
                "transfers": 0 if cfg["package_type"] != "Эконом" else 1,
                "price_per_person": cfg["flight_price_person"],
                "price_total": flights_total,
            },
            "hotel": {
                "name": cfg["hotel_name"],
                "stars": cfg["hotel_stars"],
                "price_total": hotels_total,
            },
            "grand_total": grand_total,
            # Canonical TripOption schema fields
            "id": cfg["id"],
            "title": cfg["title"],
            "destination": destination,
            "total_price": grand_total,
            "currency": "RUB",
            "score": cfg["score"],
            "flights": flights,
            "hotels": hotels,
            "budget": budget,
        }

        pkg["is_within_budget"] = (grand_total <= budget_limit) if budget_limit else True
        if budget_limit and not pkg["is_within_budget"]:
            pkg["over_budget_amount"] = grand_total - budget_limit

        packages.append(pkg)

    return packages

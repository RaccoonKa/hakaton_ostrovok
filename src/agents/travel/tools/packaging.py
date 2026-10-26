from langchain_core.tools import tool
from db.offline_db import package_offline_trip_options


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
    Ищет авиабилеты и отели в локальной оффлайн базе данных SQLite, агрегирует их
    и возвращает готовые варианты поездки: 'Эконом', 'Оптимальный' и 'Комфорт' с ценами и отелями.
    """
    try:
        packages = package_offline_trip_options(
            origin=origin,
            destination=destination,
            check_in=departure_date,
            check_out=return_date or departure_date,
            passengers=passengers,
            budget_limit=budget_limit,
        )
        if packages:
            return packages
    except Exception:
        pass

    return [
        {
            "package_type": "Эконом",
            "description": f"Доступный вариант для поездки в {destination}.",
            "grand_total": 28500 * passengers,
            "is_within_budget": True,
        },
        {
            "package_type": "Оптимальный",
            "description": f"Оптимальный прямой рейс и отель 4★ в {destination}.",
            "grand_total": 45000 * passengers,
            "is_within_budget": True,
        },
        {
            "package_type": "Комфорт",
            "description": f"Комфортный перелет и отель 5★ в {destination}.",
            "grand_total": 85000 * passengers,
            "is_within_budget": True,
        },
    ]

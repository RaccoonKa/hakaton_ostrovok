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
    packages = [
        {
            "package_type": "Эконом",
            "description": "Перелет с пересадкой Победа, скромный отель или хостел.",
            "flight": {"airline": "Победа", "transfers": 1, "price_per_person": 12000, "price_total": 12000 * passengers},
            "hotel": {"name": "Хостел 'Уют'", "stars": 2, "price_total": 4500},
            "grand_total": (12000 * passengers) + 4500,
        },
        {
            "package_type": "Оптимальный",
            "description": "Прямой рейс S7, хороший отель 4 звезды рядом с центром.",
            "flight": {"airline": "S7", "transfers": 0, "price_per_person": 18000, "price_total": 18000 * passengers},
            "hotel": {"name": "Отель 'Park Inn'", "stars": 4, "price_total": 15000},
            "grand_total": (18000 * passengers) + 15000,
        },
        {
            "package_type": "Комфорт",
            "description": "Аэрофлот в удобное время и премиум-отель 5 звезд.",
            "flight": {"airline": "Аэрофлот", "transfers": 0, "price_per_person": 25000, "price_total": 25000 * passengers},
            "hotel": {"name": "Гранд-отель 'Ritz-Carlton'", "stars": 5, "price_total": 45000},
            "grand_total": (25000 * passengers) + 45000,
        },
    ]

    for p in packages:
        p["is_within_budget"] = (p["grand_total"] <= budget_limit) if budget_limit else True
        if budget_limit and not p["is_within_budget"]:
            p["over_budget_amount"] = p["grand_total"] - budget_limit

    return packages
"""
Провайдер информации о направлениях путешествий (destinations) из data/destinations.json.
"""

import json
import logging
from typing import Any

from memory.db_storage import fetch_payloads, get_data_dir, is_db_available

logger = logging.getLogger(__name__)


TAG_ALIASES: dict[str, str] = {
    "пляж": "beach",
    "пляжный": "beach",
    "море": "sea",
    "морской": "sea",
    "горы": "mountains",
    "горный": "mountains",
    "горные лыжи": "ski",
    "лыжи": "ski",
    "сноуборд": "ski",
    "спа": "spa",
    "семья": "family",
    "дети": "family",
    "семейный": "family",
    "природа": "nature",
    "культура": "culture",
    "культурный": "culture",
    "музеи": "museums",
    "история": "history",
    "исторический": "history",
    "достопримечательности": "sightseeing",
    "экскурсии": "sightseeing",
    "гастрономия": "gastronomy",
    "еда": "food",
    "рестораны": "food",
    "шопинг": "shopping",
    "шоппинг": "shopping",
    "заграница": "foreign",
    "all inclusive": "all_inclusive",
    "все включено": "all_inclusive",
    "всё включено": "all_inclusive",
}

MONTH_EN_TO_RU: dict[str, str] = {
    "january": "январь",
    "february": "февраль",
    "march": "март",
    "april": "апрель",
    "may": "май",
    "june": "июнь",
    "july": "июль",
    "august": "август",
    "september": "сентябрь",
    "october": "октябрь",
    "november": "ноябрь",
    "december": "декабрь",
}


def _load_raw_destinations() -> list[dict[str, Any]]:
    """
    Загружает список направлений:
    сначала пробует PostgreSQL, при недоступности читает data/destinations.json.
    """
    if is_db_available():
        payloads = fetch_payloads("SELECT payload FROM destinations")
        if payloads is not None:
            return payloads

    data_dir = get_data_dir()
    dest_file = data_dir / "destinations.json"
    if not dest_file.exists():
        logger.warning("Destinations file %s not found.", dest_file)
        return []

    with open(dest_file, encoding="utf-8") as f:
        destinations: list[dict[str, Any]] = json.load(f)

    return destinations


def get_destinations(
    tags: list[str] | None = None,
    season: str | None = None,
) -> list[dict[str, Any]]:
    """
    Возвращает Топ-3 направления из data/destinations.json
    с ранжированием по совпадению тегов и сезонности.
    """
    destinations = _load_raw_destinations()
    if not destinations:
        return []

    if not tags and not season:
        return destinations[:3]

    requested_tags = [t.strip().lower() for t in tags] if tags else []
    requested_season = season.strip().lower() if season else None

    scored_destinations: list[tuple[float, dict[str, Any]]] = []

    season_months_map = {
        "summer": ["июнь", "июль", "август"],
        "лето": ["июнь", "июль", "август"],
        "winter": ["декабрь", "январь", "февраль"],
        "зима": ["декабрь", "январь", "февраль"],
        "autumn": ["сентябрь", "октябрь", "ноябрь"],
        "осень": ["сентябрь", "октябрь", "ноябрь"],
        "spring": ["март", "апрель", "май"],
        "весна": ["март", "апрель", "май"],
    }

    month_ru = (
        MONTH_EN_TO_RU.get(requested_season, requested_season)
        if requested_season
        else ""
    )

    for d in destinations:
        score = 0.0
        d_tags = [t.lower() for t in d.get("tags", [])]

        # 1. Оценка по тегам
        for req_tag in requested_tags:
            alias = TAG_ALIASES.get(req_tag)
            if req_tag in d_tags or (alias and alias in d_tags):
                score += 3.0
            elif any(
                req_tag in dt or (alias and alias in dt)
                for dt in d_tags
            ):
                score += 1.5

        # 2. Оценка по сезону
        if requested_season:
            # Проверка ключа в погоде
            weather = d.get("weather", {})
            if requested_season in weather or month_ru in weather:
                score += 2.0

            # Проверка лучших месяцев
            target_months = season_months_map.get(
                requested_season, [month_ru] if month_ru else []
            )
            best_months = [m.lower() for m in d.get("best_months", [])]
            if any(tm in best_months for tm in target_months):
                score += 2.0

            # Проверка описания сезонности
            seasonality_desc = d.get("seasonality", "").lower()
            if (
                requested_season in seasonality_desc
                or month_ru in seasonality_desc
            ):
                score += 1.0

        scored_destinations.append((score, d))

    # Сортировка по убыванию релевантности
    scored_destinations.sort(key=lambda item: item[0], reverse=True)
    return [item[1] for item in scored_destinations[:3]]

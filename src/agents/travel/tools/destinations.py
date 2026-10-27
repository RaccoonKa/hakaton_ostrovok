"""
Инструменты работы с направлениями.

* ``search_destinations`` — нормализация конкретного названия города в
  сущность из mock dataset (город, страна, IATA).
* ``suggest_destinations_tool`` — генерация подходящих городов, НЕ выбирает
  город за пользователя.

Оба инструмента работают исключительно с mock dataset. Если города нет в
dataset, он не выдумывается — возвращается статус ``unknown``.
"""

from __future__ import annotations

import json

from langchain_core.tools import tool

from agents.travel.logic.decision import suggest_destinations
from agents.travel.tools import mock_dataset as ds
from domain.planning import DestinationCandidate, Month, Preference
from domain.request import UserRequest


@tool
def search_destinations(query: str) -> str:
    """
    Нормализует название города/страны в сущность из mock dataset.

    Возвращает JSON с полями city, country, iata, known. Если сущности нет
    в dataset, возвращает {"known": false}. Никогда не выдумывает города.
    """
    dest = ds.resolve_city(query)
    if dest and ds.get_destination_by_city(dest.city):
        return json.dumps(
            {
                "known": True,
                "city": dest.city,
                "country": dest.country,
                "iata": dest.iata,
                "price_level": dest.price_level.value,
                "vibes": dest.vibes,
            },
            ensure_ascii=False,
        )
    country = ds.resolve_country(query)
    if country:
        cities = [d.city for d in ds.cities_in_country(country)]
        return json.dumps(
            {"known": False, "country": country, "cities": cities},
            ensure_ascii=False,
        )
    return json.dumps({"known": False}, ensure_ascii=False)


@tool
def suggest_destinations_tool(
    country: str = "",
    preferences: str = "",
    month: str = "",
    limit: int = 3,
) -> str:
    """
    Предлагает несколько подходящих городов из mock dataset на основании
    страны, предпочтений и месяца. Не выбирает город за пользователя —
    только возвращает кандидатов.

    :param preferences: список предпочтений через запятую (beach, history...).
    :param month: английское название месяца (july), либо пусто.
    """
    prefs = [p.strip() for p in preferences.split(",") if p.strip()]
    pref_models = [Preference(name=p) for p in prefs]
    month_models = []
    if month:
        try:
            month_models = [Month(month.strip().lower())]
        except ValueError:
            month_models = []

    req = UserRequest(preferences=pref_models)
    if month_models:
        req.date_preferences.month = month_models

    candidates: list[DestinationCandidate] = suggest_destinations(
        req, country=country or None, limit=limit
    )

    return json.dumps([c.model_dump() for c in candidates], ensure_ascii=False)


__all__ = ["search_destinations", "suggest_destinations_tool"]

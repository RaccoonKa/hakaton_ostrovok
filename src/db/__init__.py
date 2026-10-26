"""
Модуль локальной оффлайн базы данных SQLite для работы без доступа в интернет.
Автоматически инициализирует схему и наполняет данными из data/*.json при старте.
"""

from .offline_db import (
    init_db,
    seed_offline_data_if_needed,
    query_hotels,
    query_flights,
    query_activities,
    query_transfers,
    package_offline_trip_options,
)

__all__ = [
    "init_db",
    "seed_offline_data_if_needed",
    "query_hotels",
    "query_flights",
    "query_activities",
    "query_transfers",
    "package_offline_trip_options",
]

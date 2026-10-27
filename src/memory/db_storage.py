"""
PostgreSQL хранилище сущностей туризма с поддержкой автосидирования и fallback на data/*.json.
"""

import json
import logging
from pathlib import Path
from typing import Any, LiteralString, cast

import psycopg
from psycopg import sql
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from core.settings import DatabaseType, settings
from memory.postgres import get_postgres_connection_string

logger = logging.getLogger(__name__)

_DB_AVAILABLE: bool = False


def is_db_available() -> bool:
    """Проверяет, доступна ли база данных PostgreSQL для запросов."""
    global _DB_AVAILABLE
    if settings.DATABASE_TYPE not in (DatabaseType.POSTGRES, "postgres"):
        return False
    if not (
        settings.POSTGRES_HOST
        and settings.POSTGRES_USER
        and settings.POSTGRES_PASSWORD
        and settings.POSTGRES_DB
    ):
        return False
    return _DB_AVAILABLE


def set_db_available(value: bool) -> None:
    """Устанавливает флаг доступности базы данных."""
    global _DB_AVAILABLE
    _DB_AVAILABLE = value


def get_data_dir() -> Path:
    """Возвращает путь к директории с эталонными данными data/*.json."""
    candidate1 = Path(__file__).resolve().parent.parent.parent / "data"
    if candidate1.exists():
        return candidate1
    candidate2 = Path.cwd() / "data"
    if candidate2.exists():
        return candidate2
    return candidate1


async def init_db_and_seed() -> bool:
    """
    Инициализирует таблицы и индексы в PostgreSQL.
    Если таблица hotels пуста, наполняет таблицы начальными данными из data/*.json.
    При недоступности PostgreSQL логирует предупреждение и возвращает False без падения сервиса.
    """
    global _DB_AVAILABLE

    if settings.DATABASE_TYPE not in (DatabaseType.POSTGRES, "postgres"):
        logger.info(
            "DATABASE_TYPE is '%s' (not 'postgres'). Skipping PostgreSQL init and seed.",
            settings.DATABASE_TYPE,
        )
        _DB_AVAILABLE = False
        return False

    if not (
        settings.POSTGRES_HOST
        and settings.POSTGRES_USER
        and settings.POSTGRES_PASSWORD
        and settings.POSTGRES_DB
    ):
        logger.warning(
            "PostgreSQL settings are incomplete (host, user, password or db missing). "
            "Skipping init and seed. Providers will fallback to JSON files."
        )
        _DB_AVAILABLE = False
        return False

    try:
        conn_str = get_postgres_connection_string()
        async with await psycopg.AsyncConnection.connect(
            conn_str, connect_timeout=3, autocommit=True
        ) as aconn:
            async with aconn.cursor() as cur:
                # 1. Создание схемы таблиц
                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS hotels (
                        id TEXT PRIMARY KEY,
                        city TEXT NOT NULL,
                        district TEXT,
                        stars INT,
                        base_price NUMERIC,
                        pet_friendly BOOLEAN DEFAULT FALSE,
                        meal_plan TEXT,
                        free_cancellation BOOLEAN DEFAULT TRUE,
                        payload JSONB NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
                    CREATE INDEX IF NOT EXISTS idx_hotels_pet ON hotels(pet_friendly);

                    CREATE TABLE IF NOT EXISTS flights (
                        id TEXT PRIMARY KEY,
                        origin TEXT NOT NULL,
                        destination TEXT NOT NULL,
                        flight_number TEXT NOT NULL,
                        payload JSONB NOT NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(origin, destination);

                    CREATE TABLE IF NOT EXISTS trains (
                        id TEXT PRIMARY KEY,
                        origin TEXT NOT NULL,
                        destination TEXT NOT NULL,
                        train_number TEXT NOT NULL,
                        payload JSONB NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS transfers (
                        id TEXT PRIMARY KEY,
                        origin TEXT NOT NULL,
                        destination TEXT NOT NULL,
                        payload JSONB NOT NULL
                    );
                    """
                )

                # 2. Проверка наполненности данными
                await cur.execute("SELECT COUNT(*) FROM hotels;")
                row = await cur.fetchone()
                hotels_count = row[0] if row else 0

                if hotels_count == 0:
                    data_dir = get_data_dir()
                    logger.info("Database is empty. Seeding travel datasets from %s...", data_dir)

                    # Сидирование отелей
                    hotels_file = data_dir / "hotels.json"
                    if hotels_file.exists():
                        with open(hotels_file, encoding="utf-8") as f:
                            hotels = json.load(f)
                        for h in hotels:
                            await cur.execute(
                                """
                                INSERT INTO hotels (id, city, district, stars, base_price, pet_friendly, meal_plan, free_cancellation, payload)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                                ON CONFLICT (id) DO NOTHING;
                                """,
                                (
                                    h["id"],
                                    h["city"],
                                    h.get("district"),
                                    h.get("stars"),
                                    h.get("price_per_night"),
                                    h.get("pet_friendly", False),
                                    h.get("meal_plan"),
                                    h.get("free_cancellation", True),
                                    Jsonb(h),
                                ),
                            )
                        logger.info("Seeded %d hotels into database.", len(hotels))

                    # Сидирование рейсов
                    flights_file = data_dir / "flights.json"
                    if flights_file.exists():
                        with open(flights_file, encoding="utf-8") as f:
                            flights = json.load(f)
                        for f_item in flights:
                            flight_id = f_item.get("id") or f_item["flight_number"]
                            await cur.execute(
                                """
                                INSERT INTO flights (id, origin, destination, flight_number, payload)
                                VALUES (%s, %s, %s, %s, %s)
                                ON CONFLICT (id) DO NOTHING;
                                """,
                                (
                                    flight_id,
                                    f_item["origin"],
                                    f_item["destination"],
                                    f_item["flight_number"],
                                    Jsonb(f_item),
                                ),
                            )
                        logger.info("Seeded %d flights into database.", len(flights))

                    # Сидирование поездов
                    trains_file = data_dir / "trains.json"
                    if trains_file.exists():
                        with open(trains_file, encoding="utf-8") as f:
                            trains = json.load(f)
                        for t in trains:
                            train_id = t.get("id") or t["train_number"]
                            await cur.execute(
                                """
                                INSERT INTO trains (id, origin, destination, train_number, payload)
                                VALUES (%s, %s, %s, %s, %s)
                                ON CONFLICT (id) DO NOTHING;
                                """,
                                (
                                    train_id,
                                    t["origin"],
                                    t["destination"],
                                    t["train_number"],
                                    Jsonb(t),
                                ),
                            )
                        logger.info("Seeded %d trains into database.", len(trains))

                    # Сидирование трансферов
                    transfers_file = data_dir / "transfers.json"
                    if transfers_file.exists():
                        with open(transfers_file, encoding="utf-8") as f:
                            transfers = json.load(f)
                        for tr in transfers:
                            await cur.execute(
                                """
                                INSERT INTO transfers (id, origin, destination, payload)
                                VALUES (%s, %s, %s, %s)
                                ON CONFLICT (id) DO NOTHING;
                                """,
                                (
                                    tr["id"],
                                    tr["origin"],
                                    tr["destination"],
                                    Jsonb(tr),
                                ),
                            )
                        logger.info("Seeded %d transfers into database.", len(transfers))
                else:
                    logger.info("Database already seeded (%d hotels present).", hotels_count)

        _DB_AVAILABLE = True
        return True

    except Exception as e:
        logger.warning(
            "Could not connect to or initialize PostgreSQL database: %s. "
            "Continuing with fallback to local JSON files.",
            e,
        )
        _DB_AVAILABLE = False
        return False


def query_db(query: str, params: tuple | list | dict = ()) -> list[dict[str, Any]] | None:
    """Выполняет синхронный SQL-запрос к PostgreSQL."""
    if not is_db_available():
        return None
    try:
        conn_str = get_postgres_connection_string()
        with psycopg.connect(conn_str, connect_timeout=2) as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql.SQL(cast(LiteralString, query)), params)
                return cast(list[dict[str, Any]], cur.fetchall())
    except Exception as e:
        logger.warning("Database query execution failed (%s). Falling back to JSON.", e)
        return None


def fetch_payloads(query: str, params: tuple | list | dict = ()) -> list[dict[str, Any]] | None:
    """
    Выполняет SQL-запрос и извлекает столбец payload (JSONB) из каждой строки.
    Возвращает список словарей payload или None, если база недоступна.
    """
    rows = query_db(query, params)
    if rows is None:
        return None
    return [row["payload"] for row in rows if "payload" in row]


async def aquery_db(query: str, params: tuple | list | dict = ()) -> list[dict[str, Any]] | None:
    """Выполняет асинхронный SQL-запрос к PostgreSQL."""
    if not is_db_available():
        return None
    try:
        conn_str = get_postgres_connection_string()
        async with await psycopg.AsyncConnection.connect(
            conn_str, connect_timeout=2
        ) as aconn:
            async with aconn.cursor(row_factory=dict_row) as cur:
                await cur.execute(sql.SQL(cast(LiteralString, query)), params)
                return cast(list[dict[str, Any]], await cur.fetchall())
    except Exception as e:
        logger.warning("Async database query execution failed (%s). Falling back to JSON.", e)
        return None

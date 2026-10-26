"""
Локальная база данных SQLite для 100% оффлайн работы AI-агента путешествий.
Автоматически инициализирует таблицы и загружает JSON фикстуры при старте приложения.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any

logger = logging.getLogger("offline_db")

# Пути к данным и БД
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "travel_offline.db"


def get_connection() -> sqlite3.Connection:
    """Возвращает соединение с локальной базой данных SQLite."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Создаёт таблицы базы данных SQLite, если они ещё не существуют."""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Таблица отелей
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS hotels (
                id TEXT PRIMARY KEY,
                hotel TEXT NOT NULL,
                city TEXT NOT NULL,
                address TEXT,
                stars INTEGER DEFAULT 0,
                rating REAL,
                room_type TEXT,
                meal_plan TEXT,
                price_per_night REAL NOT NULL,
                currency TEXT DEFAULT 'RUB',
                refundable INTEGER DEFAULT 1,
                cancellation_conditions TEXT,
                amenities TEXT,
                image_url TEXT
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_hotels_price ON hotels(price_per_night)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_hotels_stars ON hotels(stars)")

        # Таблица авиарейсов
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS flights (
                id TEXT PRIMARY KEY,
                airline TEXT NOT NULL,
                flight_number TEXT NOT NULL,
                origin TEXT NOT NULL,
                origin_iata TEXT,
                destination TEXT NOT NULL,
                destination_iata TEXT,
                departure_at TEXT NOT NULL,
                arrival_at TEXT NOT NULL,
                duration TEXT,
                transfers INTEGER DEFAULT 0,
                carrier TEXT,
                baggage TEXT,
                price_per_person REAL NOT NULL,
                currency TEXT DEFAULT 'RUB',
                refundable INTEGER DEFAULT 1,
                changeable INTEGER DEFAULT 1
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(origin, destination)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_flights_price ON flights(price_per_person)")

        # Таблица активностей и экскурсий
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                city TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                duration TEXT,
                price REAL NOT NULL,
                currency TEXT DEFAULT 'RUB',
                description TEXT
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activities_city ON activities(city)")

        # Таблица трансферов
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS transfers (
                id TEXT PRIMARY KEY,
                origin TEXT NOT NULL,
                destination TEXT NOT NULL,
                transport_type TEXT DEFAULT 'car',
                duration TEXT,
                price REAL NOT NULL,
                currency TEXT DEFAULT 'RUB',
                conditions TEXT
            )
            """
        )

        conn.commit()
    logger.info("Схема локальной БД успешно проверена/инициализирована.")


def seed_offline_data_if_needed() -> None:
    """
    Загружает данные из JSON файлов в data/ в локальную БД SQLite,
    если таблицы пустые. Гарантирует оффлайн работу.
    """
    init_db()

    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Отели
        cursor.execute("SELECT COUNT(*) as count FROM hotels")
        if cursor.fetchone()["count"] == 0:
            hotels_file = DATA_DIR / "hotels.json"
            if hotels_file.exists():
                with open(hotels_file, "r", encoding="utf-8") as f:
                    hotels_data = json.load(f)
                for h in hotels_data:
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO hotels (
                            id, hotel, city, address, stars, rating, room_type,
                            meal_plan, price_per_night, currency, refundable,
                            cancellation_conditions, amenities, image_url
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            h.get("id"),
                            h.get("hotel"),
                            h.get("city"),
                            h.get("address"),
                            h.get("stars", 0),
                            h.get("rating"),
                            h.get("room_type"),
                            h.get("meal_plan"),
                            h.get("price_per_night", 0),
                            h.get("currency", "RUB"),
                            1 if h.get("refundable", True) else 0,
                            h.get("cancellation_conditions"),
                            json.dumps(h.get("amenities", []), ensure_ascii=False),
                            h.get("image_url"),
                        ),
                    )
                logger.info(f"Загружено {len(hotels_data)} отелей из JSON.")

        # 2. Рейсы
        cursor.execute("SELECT COUNT(*) as count FROM flights")
        if cursor.fetchone()["count"] == 0:
            flights_file = DATA_DIR / "flights.json"
            if flights_file.exists():
                with open(flights_file, "r", encoding="utf-8") as f:
                    flights_data = json.load(f)
                for flt in flights_data:
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO flights (
                            id, airline, flight_number, origin, origin_iata,
                            destination, destination_iata, departure_at, arrival_at,
                            duration, transfers, carrier, baggage, price_per_person,
                            currency, refundable, changeable
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            flt.get("id"),
                            flt.get("airline"),
                            flt.get("flight_number"),
                            flt.get("origin"),
                            flt.get("origin_iata"),
                            flt.get("destination"),
                            flt.get("destination_iata"),
                            flt.get("departure_at"),
                            flt.get("arrival_at"),
                            flt.get("duration"),
                            flt.get("transfers", 0),
                            flt.get("carrier"),
                            flt.get("baggage"),
                            flt.get("price_per_person", 0),
                            flt.get("currency", "RUB"),
                            1 if flt.get("refundable", True) else 0,
                            1 if flt.get("changeable", True) else 0,
                        ),
                    )
                logger.info(f"Загружено {len(flights_data)} авиарейсов из JSON.")

        # 3. Активности
        cursor.execute("SELECT COUNT(*) as count FROM activities")
        if cursor.fetchone()["count"] == 0:
            act_file = DATA_DIR / "activities.json"
            if act_file.exists():
                with open(act_file, "r", encoding="utf-8") as f:
                    act_data = json.load(f)
                for a in act_data:
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO activities (
                            id, city, name, category, duration, price, currency, description
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            a.get("id"),
                            a.get("city"),
                            a.get("name"),
                            a.get("category"),
                            a.get("duration"),
                            a.get("price", 0),
                            a.get("currency", "RUB"),
                            a.get("description"),
                        ),
                    )
                logger.info(f"Загружено {len(act_data)} активностей из JSON.")

        # 4. Трансферы
        cursor.execute("SELECT COUNT(*) as count FROM transfers")
        if cursor.fetchone()["count"] == 0:
            trf_file = DATA_DIR / "transfers.json"
            if trf_file.exists():
                with open(trf_file, "r", encoding="utf-8") as f:
                    trf_data = json.load(f)
                for t in trf_data:
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO transfers (
                            id, origin, destination, transport_type, duration, price, currency, conditions
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            t.get("id"),
                            t.get("origin"),
                            t.get("destination"),
                            t.get("transport_type", "car"),
                            t.get("duration"),
                            t.get("price", 0),
                            t.get("currency", "RUB"),
                            t.get("conditions"),
                        ),
                    )
                logger.info(f"Загружено {len(trf_data)} трансферов из JSON.")

        conn.commit()


def query_hotels(
    city: str | None = None,
    min_stars: int | None = None,
    max_price_per_night: float | None = None,
    min_rating: float | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Поиск отелей в локальной базе данных с фильтрацией."""
    seed_offline_data_if_needed()

    query = "SELECT * FROM hotels WHERE 1=1"
    params: list[Any] = []

    if city:
        query += " AND city LIKE ?"
        params.append(f"%{city}%")
    if min_stars is not None:
        query += " AND stars >= ?"
        params.append(min_stars)
    if max_price_per_night is not None:
        query += " AND price_per_night <= ?"
        params.append(max_price_per_night)
    if min_rating is not None:
        query += " AND rating >= ?"
        params.append(min_rating)

    query += " ORDER BY rating DESC, price_per_night ASC LIMIT ?"
    params.append(limit)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = []
        for r in rows:
            item = dict(r)
            item["refundable"] = bool(item.get("refundable", 1))
            try:
                item["amenities"] = json.loads(item.get("amenities") or "[]")
            except Exception:
                item["amenities"] = []
            results.append(item)
        return results


def query_flights(
    origin: str | None = None,
    destination: str | None = None,
    direct_only: bool = False,
    max_price: float | None = None,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Поиск авиабилетов в локальной базе данных."""
    seed_offline_data_if_needed()

    query = "SELECT * FROM flights WHERE 1=1"
    params: list[Any] = []

    if origin:
        query += " AND (origin LIKE ? OR origin_iata LIKE ?)"
        params.extend([f"%{origin}%", f"%{origin}%"])
    if destination:
        query += " AND (destination LIKE ? OR destination_iata LIKE ?)"
        params.extend([f"%{destination}%", f"%{destination}%"])
    if direct_only:
        query += " AND transfers = 0"
    if max_price is not None:
        query += " AND price_per_person <= ?"
        params.append(max_price)

    query += " ORDER BY price_per_person ASC LIMIT ?"
    params.append(limit)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()

        results = []
        for r in rows:
            item = dict(r)
            item["refundable"] = bool(item.get("refundable", 1))
            item["changeable"] = bool(item.get("changeable", 1))
            results.append(item)
        return results


def query_activities(city: str | None = None, limit: int = 5) -> list[dict[str, Any]]:
    """Поиск экскурсий и активностей по городу."""
    seed_offline_data_if_needed()

    query = "SELECT * FROM activities WHERE 1=1"
    params: list[Any] = []
    if city:
        query += " AND city LIKE ?"
        params.append(f"%{city}%")
    query += " LIMIT ?"
    params.append(limit)

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]


def query_transfers(destination: str | None = None) -> list[dict[str, Any]]:
    """Поиск трансферов."""
    seed_offline_data_if_needed()

    query = "SELECT * FROM transfers WHERE 1=1"
    params: list[Any] = []
    if destination:
        query += " AND destination LIKE ?"
        params.append(f"%{destination}%")

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [dict(r) for r in cursor.fetchall()]


def package_offline_trip_options(
    origin: str = "Москва",
    destination: str = "Сочи",
    check_in: str = "2026-07-01",
    check_out: str = "2026-07-08",
    passengers: int = 2,
    budget_limit: float | None = None,
) -> list[dict[str, Any]]:
    """
    Формирует готовые пакетные варианты путешествия (Эконом, Оптимальный, Премиум/Комфорт)
    из данных локальной базы без обращения к интернету.
    """
    seed_offline_data_if_needed()

    hotels = query_hotels(city=destination, limit=10)
    flights = query_flights(origin=origin, destination=destination, limit=10)
    activities = query_activities(city=destination, limit=5)

    if not hotels:
        hotels = query_hotels(limit=5)
    if not flights:
        flights = query_flights(limit=5)

    nights = 7  # По умолчанию неделя

    packages = []
    tiers = [
        {"name": "Эконом", "flight_idx": 0, "hotel_idx": min(len(hotels) - 1, 2), "tag": "Доступный"},
        {"name": "Оптимальный", "flight_idx": min(len(flights) - 1, 1), "hotel_idx": min(len(hotels) - 1, 1), "tag": "Выбор туристов"},
        {"name": "Комфорт", "flight_idx": min(len(flights) - 1, 2), "hotel_idx": 0, "tag": "Максимальный комфорт"},
    ]

    for tier in tiers:
        flt = flights[tier["flight_idx"]] if flights else None
        htl = hotels[tier["hotel_idx"]] if hotels else None

        flight_cost = (flt["price_per_person"] * passengers) if flt else 0
        hotel_cost = (htl["price_per_night"] * nights) if htl else 0
        activities_cost = sum(a["price"] for a in activities[:2]) if activities else 0
        total_cost = flight_cost + hotel_cost + activities_cost

        option = {
            "id": f"opt-{destination.lower()}-{tier['name'].lower()}",
            "title": f"Тур в {destination}: {tier['name']}",
            "description": f"{tier['tag']}. Отель {htl['hotel'] if htl else ''} ({htl['stars'] if htl else ''}★) + перелёт {flt['airline'] if flt else ''}.",
            "price_total": total_cost,
            "currency": "RUB",
            "is_within_budget": (total_cost <= budget_limit) if budget_limit else True,
            "package_type": tier["name"],
            "hotel": {
                "hotel": htl["hotel"] if htl else "Отель",
                "city": destination,
                "check_in": check_in,
                "check_out": check_out,
                "guests": passengers,
                "room_type": htl.get("room_type") if htl else "Стандартный номер",
                "meal_plan": htl.get("meal_plan") if htl else "breakfast",
                "price": hotel_cost,
                "currency": "RUB",
                "refundable": htl.get("refundable", True) if htl else True,
                "cancellation_conditions": htl.get("cancellation_conditions") if htl else "Бесплатная отмена",
                "amenities": htl.get("amenities", []) if htl else [],
                "rating": htl.get("rating", 4.5) if htl else 4.5,
                "image_url": htl.get("image_url") if htl else None,
            },
            "flight": {
                "airline": flt["airline"] if flt else "Аэрофлот",
                "flight_number": flt["flight_number"] if flt else "SU-100",
                "origin": origin,
                "destination": destination,
                "departure_at": flt["departure_at"] if flt else check_in,
                "arrival_at": flt["arrival_at"] if flt else check_in,
                "duration": flt.get("duration") if flt else "4ч 10м",
                "stops": flt.get("transfers", 0) if flt else 0,
                "baggage": flt.get("baggage") if flt else "Багаж включён",
                "price": flight_cost,
                "currency": "RUB",
                "refundable": flt.get("refundable", True) if flt else True,
                "changeable": flt.get("changeable", True) if flt else True,
            },
            "price_breakdown": {
                "base_price": flight_cost + hotel_cost,
                "taxes_and_fees": 0,
                "services": activities_cost,
                "currency": "RUB",
            },
            "activities": activities[:2] if activities else [],
        }
        packages.append(option)

    return packages

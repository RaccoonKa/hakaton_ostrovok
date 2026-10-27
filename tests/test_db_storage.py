"""
Тесты для модуля db_storage: проверка схемы, индексов, автосидирования 5 датасетов,
обработки параметров и бесшовного fallback на локальные data/*.json.
"""

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from core.settings import DatabaseType, settings
from memory.db_storage import (
    aquery_db,
    fetch_payloads,
    get_data_dir,
    init_db_and_seed,
    is_db_available,
    query_db,
    seed_database_if_empty,
    set_db_available,
)
from providers.destinations import get_destinations
from providers.flights import search_flights
from providers.hotels import search_hotels
from providers.trains import search_trains
from providers.transfers import get_transfer


def test_get_data_dir_contains_all_five_datasets():
    """Проверка доступности директории данных и наличия всех 5 эталонных файлов."""
    data_dir = get_data_dir()
    assert isinstance(data_dir, Path)
    assert data_dir.exists()

    expected_files = [
        "destinations.json",
        "hotels.json",
        "flights.json",
        "trains.json",
        "transfers.json",
    ]
    for filename in expected_files:
        file_path = data_dir / filename
        assert file_path.exists(), f"Файл {filename} отсутствует в {data_dir}"
        with open(file_path, encoding="utf-8") as f:
            data = json.load(f)
        assert isinstance(data, list)
        assert len(data) > 0


def test_is_db_available_flag_behavior():
    """Проверка логики флага доступности базы данных."""
    with patch.object(settings, "DATABASE_TYPE", DatabaseType.SQLITE):
        set_db_available(True)
        assert not is_db_available()

    with patch.object(settings, "DATABASE_TYPE", DatabaseType.POSTGRES):
        with patch.object(settings, "POSTGRES_HOST", None):
            set_db_available(True)
            assert not is_db_available()

        with (
            patch.object(settings, "POSTGRES_HOST", "localhost"),
            patch.object(settings, "POSTGRES_USER", "postgres"),
            patch.object(settings, "POSTGRES_PASSWORD", MagicMock(get_secret_value=lambda: "secret")),
            patch.object(settings, "POSTGRES_DB", "travel"),
        ):
            set_db_available(False)
            assert not is_db_available()
            set_db_available(True)
            assert is_db_available()
            set_db_available(False)


def test_query_db_and_fetch_payloads_fallback_when_db_unavailable():
    """Проверка безопасного возврата None при недоступности PostgreSQL."""
    set_db_available(False)
    assert query_db("SELECT * FROM hotels") is None
    assert fetch_payloads("SELECT payload FROM hotels") is None


@pytest.mark.asyncio
async def test_aquery_db_fallback_when_db_unavailable():
    """Проверка безопасного возврата None в асинхронном запросе при недоступности PostgreSQL."""
    set_db_available(False)
    assert await aquery_db("SELECT * FROM hotels") is None


def test_query_db_graceful_on_connection_error():
    """Проверка перехвата исключений при ошибке подключения в query_db."""
    with patch("memory.db_storage.is_db_available", return_value=True):
        with patch("psycopg.connect", side_effect=Exception("Connection refused")):
            res = query_db("SELECT * FROM hotels")
            assert res is None


@pytest.mark.asyncio
async def test_aquery_db_graceful_on_connection_error():
    """Проверка перехвата исключений при ошибке подключения в aquery_db."""
    with patch("memory.db_storage.is_db_available", return_value=True):
        with patch("psycopg.AsyncConnection.connect", side_effect=Exception("Async connection refused")):
            res = await aquery_db("SELECT * FROM hotels")
            assert res is None


def test_fetch_payloads_extraction_and_params():
    """Проверка извлечения словарей payload и передачи параметров."""
    mock_rows = [
        {"id": "h1", "payload": {"id": "h1", "city": "Сочи", "stars": 4}},
        {"id": "h2", "payload": {"id": "h2", "city": "Сочи", "stars": 5}},
        {"id": "h3", "other": "no_payload"},
    ]

    with patch("memory.db_storage.query_db", return_value=mock_rows) as mock_q:
        payloads = fetch_payloads("SELECT payload FROM hotels WHERE city = %s", ("Сочи",))
        assert mock_q.called
        assert mock_q.call_args[0][1] == ("Сочи",)
        assert payloads == [
            {"id": "h1", "city": "Сочи", "stars": 4},
            {"id": "h2", "city": "Сочи", "stars": 5},
        ]


@pytest.mark.asyncio
async def test_init_db_and_seed_skips_when_not_postgres():
    """Проверка пропуска инициализации PostgreSQL, если тип БД не postgres."""
    with patch.object(settings, "DATABASE_TYPE", DatabaseType.SQLITE):
        result = await init_db_and_seed()
        assert result is False
        assert not is_db_available()


@pytest.mark.asyncio
async def test_init_db_and_seed_graceful_on_connect_failure():
    """Проверка безаварийного завершения init_db_and_seed при ошибке соединения."""
    with (
        patch.object(settings, "DATABASE_TYPE", DatabaseType.POSTGRES),
        patch.object(settings, "POSTGRES_HOST", "invalid_host_12345"),
        patch.object(settings, "POSTGRES_USER", "postgres"),
        patch.object(settings, "POSTGRES_PASSWORD", MagicMock(get_secret_value=lambda: "secret")),
        patch.object(settings, "POSTGRES_DB", "travel"),
    ):
        result = await init_db_and_seed()
        assert result is False
        assert not is_db_available()


@pytest.mark.asyncio
async def test_seed_database_if_empty_alias():
    """Проверка работы функции seed_database_if_empty."""
    with patch("memory.db_storage.init_db_and_seed", return_value=True) as mock_init:
        res = await seed_database_if_empty()
        assert res is True
        assert mock_init.called


@pytest.mark.asyncio
async def test_init_db_and_seed_creates_schema_and_seeds_five_datasets():
    """
    Проверка создания DDL (5 таблиц, B-Tree и GIN индексы) и сидирования
    всех 5 датасетов в пустую БД.
    """
    executed_queries: list[str] = []
    executed_params: list[Any] = []

    class FakeAsyncCursor:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def execute(self, query: Any, params: Any = None):
            executed_queries.append(str(query))
            executed_params.append(params)

        async def fetchone(self):
            return [0]

    class FakeAsyncConn:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        def cursor(self, row_factory=None):
            return FakeAsyncCursor()

    with (
        patch.object(settings, "DATABASE_TYPE", DatabaseType.POSTGRES),
        patch.object(settings, "POSTGRES_HOST", "localhost"),
        patch.object(settings, "POSTGRES_USER", "postgres"),
        patch.object(settings, "POSTGRES_PASSWORD", MagicMock(get_secret_value=lambda: "secret")),
        patch.object(settings, "POSTGRES_DB", "travel"),
        patch("psycopg.AsyncConnection.connect", AsyncMock(return_value=FakeAsyncConn())),
    ):
        success = await init_db_and_seed()
        assert success is True
        assert is_db_available() is True

        # 1. Проверяем наличие всех 5 таблиц в DDL
        ddl = executed_queries[0]
        assert "CREATE TABLE IF NOT EXISTS destinations" in ddl
        assert "CREATE TABLE IF NOT EXISTS hotels" in ddl
        assert "CREATE TABLE IF NOT EXISTS flights" in ddl
        assert "CREATE TABLE IF NOT EXISTS trains" in ddl
        assert "CREATE TABLE IF NOT EXISTS transfers" in ddl

        # 2. Проверяем B-Tree индексы
        assert "idx_destinations_city" in ddl
        assert "idx_hotels_city" in ddl
        assert "idx_flights_route" in ddl
        assert "idx_trains_route" in ddl
        assert "idx_transfers_route" in ddl

        # 3. Проверяем GIN индексы на payload
        assert "idx_destinations_payload ON destinations USING gin (payload)" in ddl
        assert "idx_hotels_payload ON hotels USING gin (payload)" in ddl
        assert "idx_flights_payload ON flights USING gin (payload)" in ddl
        assert "idx_trains_payload ON trains USING gin (payload)" in ddl
        assert "idx_transfers_payload ON transfers USING gin (payload)" in ddl

        # 4. Проверяем, что были выполнены проверки и вставки для всех 5 датасетов
        assert any("INSERT INTO destinations" in q for q in executed_queries)
        assert any("INSERT INTO hotels" in q for q in executed_queries)
        assert any("INSERT INTO flights" in q for q in executed_queries)
        assert any("INSERT INTO trains" in q for q in executed_queries)
        assert any("INSERT INTO transfers" in q for q in executed_queries)

    set_db_available(False)


@pytest.mark.asyncio
async def test_init_db_and_seed_skips_when_tables_already_populated():
    """Проверка того, что сидирование не дублирует данные, если таблицы уже наполнены."""
    executed_queries: list[str] = []

    class FakeAsyncCursor:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        async def execute(self, query: Any, params: Any = None):
            executed_queries.append(str(query))

        async def fetchone(self):
            return [10]

    class FakeAsyncConn:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            pass

        def cursor(self, row_factory=None):
            return FakeAsyncCursor()

    with (
        patch.object(settings, "DATABASE_TYPE", DatabaseType.POSTGRES),
        patch.object(settings, "POSTGRES_HOST", "localhost"),
        patch.object(settings, "POSTGRES_USER", "postgres"),
        patch.object(settings, "POSTGRES_PASSWORD", MagicMock(get_secret_value=lambda: "secret")),
        patch.object(settings, "POSTGRES_DB", "travel"),
        patch("psycopg.AsyncConnection.connect", AsyncMock(return_value=FakeAsyncConn())),
    ):
        success = await init_db_and_seed()
        assert success is True

        # DDL создается, но INSERT не вызывается ни для одной таблицы
        assert not any("INSERT INTO" in q for q in executed_queries)

    set_db_available(False)


def test_graceful_fallback_all_five_providers():
    """
    Проверка того, что все 5 провайдеров стабильно работают через локальные JSON,
    когда PostgreSQL недоступен.
    """
    set_db_available(False)
    d_checkin = date(2026, 8, 1)
    d_checkout = date(2026, 8, 8)
    dt_arrival = datetime(2026, 8, 1, 14, 0)

    # 1. Destinations
    destinations = get_destinations(tags=["beach"])
    assert len(destinations) > 0
    assert any(d["city"] in ("Сочи", "Анталья", "Стамбул", "Дубай", "Пхукет") for d in destinations)

    # 2. Hotels
    hotels = search_hotels(city="Сочи", check_in=d_checkin, check_out=d_checkout)
    assert len(hotels) > 0
    assert all(h.city == "Сочи" for h in hotels)

    # 3. Flights
    flights = search_flights(origin="Москва", destination="Сочи", departure_date=d_checkin)
    assert len(flights) > 0
    assert all("Сочи" in f.destination or "AER" in f.destination for f in flights)

    # 4. Trains
    trains = search_trains(origin="Москва", destination="Сочи", departure_date=d_checkin)
    assert len(trains) > 0
    assert all("Сочи" in t.destination or "Адлер" in t.destination for t in trains)

    # 5. Transfers
    transfer = get_transfer(hub="AER", destination="Сочи", arrival_at=dt_arrival)
    assert transfer is not None
    assert "AER" in transfer.origin or "Сочи" in transfer.destination

from contextlib import AbstractAsyncContextManager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from core.settings import DatabaseType, settings
from memory.db_storage import (
    aquery_db,
    fetch_payloads,
    init_db_and_seed,
    is_db_available,
    query_db,
    seed_database_if_empty,
)
from memory.postgres import get_postgres_saver, get_postgres_store
from memory.sqlite import get_sqlite_saver, get_sqlite_store


def initialize_database() -> AbstractAsyncContextManager[
    AsyncSqliteSaver | AsyncPostgresSaver
]:
    """
    Initialize the appropriate database checkpointer based on configuration.
    Returns an initialized AsyncCheckpointer instance.
    """
    if settings.DATABASE_TYPE == DatabaseType.POSTGRES:
        return get_postgres_saver()
    else:  # Default to SQLite
        return get_sqlite_saver()


def initialize_store():
    """
    Initialize the appropriate store based on configuration.
    Returns an async context manager for the initialized store.
    """
    if settings.DATABASE_TYPE == DatabaseType.POSTGRES:
        return get_postgres_store()
    else:  # Default to SQLite
        return get_sqlite_store()


__all__ = [
    "aquery_db",
    "fetch_payloads",
    "init_db_and_seed",
    "initialize_database",
    "initialize_store",
    "is_db_available",
    "query_db",
    "seed_database_if_empty",
]

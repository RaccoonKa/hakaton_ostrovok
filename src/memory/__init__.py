from contextlib import AbstractAsyncContextManager

from langgraph.checkpoint.mongodb import MongoDBSaver
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
from memory.mongodb import get_mongo_saver
from memory.postgres import get_postgres_saver, get_postgres_store
from memory.sqlite import get_sqlite_saver, get_sqlite_store


def initialize_database() -> AbstractAsyncContextManager[
    AsyncSqliteSaver | AsyncPostgresSaver | MongoDBSaver
]:
    """
    Initialize the appropriate database checkpointer based on configuration.
    Returns an initialized AsyncCheckpointer instance.
    """
    if settings.DATABASE_TYPE == DatabaseType.POSTGRES:
        return get_postgres_saver()
    if settings.DATABASE_TYPE == DatabaseType.MONGO:
        return get_mongo_saver()
    else:  # Default to SQLite
        return get_sqlite_saver()


def initialize_store():
    """
    Initialize the appropriate store based on configuration.
    Returns an async context manager for the initialized store.
    """
    if settings.DATABASE_TYPE == DatabaseType.POSTGRES:
        return get_postgres_store()
    # TODO: Add Mongo store - https://pypi.org/project/langgraph-store-mongodb/
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

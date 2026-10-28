"""User accounts and thread ownership storage with PostgreSQL and in-memory fallback."""

import logging
from datetime import UTC, datetime
from typing import Any, cast

import psycopg
from psycopg.rows import dict_row

from memory.db_storage import is_db_available
from memory.postgres import get_postgres_connection_string

logger = logging.getLogger(__name__)

# In-memory stores used when PostgreSQL is unavailable
_in_memory_users: dict[str, dict[str, Any]] = {}  # id -> user_dict
_in_memory_threads: dict[str, dict[str, Any]] = {}  # thread_id -> thread_dict


def clear_in_memory_storage() -> None:
    """Clear in-memory users and threads (useful for test resets)."""
    _in_memory_users.clear()
    _in_memory_threads.clear()


async def init_user_tables() -> None:
    """Create users and user_threads tables with indices if PostgreSQL is available."""
    if not is_db_available():
        return

    try:
        conn_str = get_postgres_connection_string()
        async with await psycopg.AsyncConnection.connect(
            conn_str, connect_timeout=3, autocommit=True
        ) as aconn:
            async with aconn.cursor() as cur:
                await cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        email TEXT UNIQUE,
                        password_hash TEXT,
                        full_name TEXT,
                        phone TEXT,
                        created_at TEXT
                    );

                    CREATE TABLE IF NOT EXISTS user_threads (
                        thread_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        title TEXT,
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    );

                    CREATE INDEX IF NOT EXISTS idx_user_threads_user_id ON user_threads (user_id);
                    """
                )
    except Exception as e:
        logger.warning("Failed to initialize user tables in PostgreSQL: %s", e)


async def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    """Find user by user_id."""
    if is_db_available():
        try:
            conn_str = get_postgres_connection_string()
            async with await psycopg.AsyncConnection.connect(conn_str, connect_timeout=2) as aconn:
                async with aconn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        "SELECT id, email, password_hash, full_name, phone, created_at FROM users WHERE id = %s",
                        (user_id,),
                    )
                    row = await cur.fetchone()
                    return dict(row) if row else None
        except Exception as e:
            logger.warning("get_user_by_id failed on DB, using in-memory: %s", e)

    return _in_memory_users.get(user_id)


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    """Find user by email (case-insensitive)."""
    normalized = email.strip().lower()
    if is_db_available():
        try:
            conn_str = get_postgres_connection_string()
            async with await psycopg.AsyncConnection.connect(conn_str, connect_timeout=2) as aconn:
                async with aconn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        "SELECT id, email, password_hash, full_name, phone, created_at FROM users WHERE LOWER(email) = %s",
                        (normalized,),
                    )
                    row = await cur.fetchone()
                    return dict(row) if row else None
        except Exception as e:
            logger.warning("get_user_by_email failed on DB, using in-memory: %s", e)

    for user in _in_memory_users.values():
        if user["email"].strip().lower() == normalized:
            return user
    return None


async def create_user(
    id: str,
    email: str,
    password_hash: str,
    full_name: str,
    phone: str | None = None,
    created_at: str | None = None,
) -> dict[str, Any]:
    """Persist new registered user."""
    ts = created_at or datetime.now(UTC).isoformat()
    user_record = {
        "id": id,
        "email": email.strip(),
        "password_hash": password_hash,
        "full_name": full_name,
        "phone": phone,
        "created_at": ts,
    }

    if is_db_available():
        try:
            conn_str = get_postgres_connection_string()
            async with await psycopg.AsyncConnection.connect(
                conn_str, connect_timeout=2, autocommit=True
            ) as aconn:
                async with aconn.cursor() as cur:
                    await cur.execute(
                        """
                        INSERT INTO users (id, email, password_hash, full_name, phone, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (id, email.strip(), password_hash, full_name, phone, ts),
                    )
            return user_record
        except Exception as e:
            logger.warning("create_user failed on DB, saving in-memory: %s", e)

    _in_memory_users[id] = user_record
    return user_record


async def get_thread_owner(thread_id: str) -> str | None:
    """Return owner user_id of thread or None if thread not registered."""
    if is_db_available():
        try:
            conn_str = get_postgres_connection_string()
            async with await psycopg.AsyncConnection.connect(conn_str, connect_timeout=2) as aconn:
                async with aconn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        "SELECT user_id FROM user_threads WHERE thread_id = %s",
                        (thread_id,),
                    )
                    row = await cur.fetchone()
                    return str(row["user_id"]) if row else None
        except Exception as e:
            logger.warning("get_thread_owner failed on DB, using in-memory: %s", e)

    record = _in_memory_threads.get(thread_id)
    return record["user_id"] if record else None


async def claim_or_touch_thread(
    thread_id: str,
    user_id: str,
    title: str | None = None,
) -> None:
    """Atomically insert or update updated_at/title for thread."""
    if is_db_available():
        try:
            conn_str = get_postgres_connection_string()
            async with await psycopg.AsyncConnection.connect(
                conn_str, connect_timeout=2, autocommit=True
            ) as aconn:
                async with aconn.cursor() as cur:
                    await cur.execute(
                        """
                        INSERT INTO user_threads (thread_id, user_id, title, updated_at)
                        VALUES (%s, %s, %s, NOW())
                        ON CONFLICT (thread_id) DO UPDATE SET
                            updated_at = NOW(),
                            title = COALESCE(EXCLUDED.title, user_threads.title)
                        """,
                        (thread_id, user_id, title),
                    )
            return
        except Exception as e:
            logger.warning("claim_or_touch_thread failed on DB, using in-memory: %s", e)

    now = datetime.now(UTC)
    if thread_id in _in_memory_threads:
        existing = _in_memory_threads[thread_id]
        existing["updated_at"] = now
        if title is not None:
            existing["title"] = title
    else:
        _in_memory_threads[thread_id] = {
            "thread_id": thread_id,
            "user_id": user_id,
            "title": title,
            "updated_at": now,
        }


async def list_user_threads(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    """List threads belonging to user, most recently updated first."""
    if is_db_available():
        try:
            conn_str = get_postgres_connection_string()
            async with await psycopg.AsyncConnection.connect(conn_str, connect_timeout=2) as aconn:
                async with aconn.cursor(row_factory=dict_row) as cur:
                    await cur.execute(
                        """
                        SELECT thread_id, user_id, title, updated_at
                        FROM user_threads
                        WHERE user_id = %s
                        ORDER BY updated_at DESC
                        LIMIT %s
                        """,
                        (user_id, limit),
                    )
                    rows = await cur.fetchall()
                    return [dict(r) for r in rows]
        except Exception as e:
            logger.warning("list_user_threads failed on DB, using in-memory: %s", e)

    matching = [t for t in _in_memory_threads.values() if t["user_id"] == user_id]
    matching.sort(key=lambda t: t.get("updated_at") or datetime.min, reverse=True)
    return matching[:limit]


async def migrate_guest_threads(guest_user_id: str, new_user_id: str) -> int:
    """Migrate all threads belonging to guest_user_id to new_user_id."""
    if is_db_available():
        try:
            conn_str = get_postgres_connection_string()
            async with await psycopg.AsyncConnection.connect(
                conn_str, connect_timeout=2, autocommit=True
            ) as aconn:
                async with aconn.cursor() as cur:
                    await cur.execute(
                        "UPDATE user_threads SET user_id = %s WHERE user_id = %s",
                        (new_user_id, guest_user_id),
                    )
                    return cast(int, cur.rowcount)
        except Exception as e:
            logger.warning("migrate_guest_threads failed on DB, using in-memory: %s", e)

    migrated = 0
    for t in _in_memory_threads.values():
        if t["user_id"] == guest_user_id:
            t["user_id"] = new_user_id
            migrated += 1
    return migrated

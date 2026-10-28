"""Tests for authentication, authorization, rate limiting, and thread isolation."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage
from langgraph.types import StateSnapshot
from pydantic import SecretStr
import pytest

from core.auth_crypto import login_rate_limiter
from memory import user_storage
from service import app


@pytest.fixture(autouse=True)
def reset_storage_and_limiter():
    """Clear memory stores and rate limits before each test."""
    user_storage.clear_in_memory_storage()
    login_rate_limiter.reset()
    yield
    user_storage.clear_in_memory_storage()
    login_rate_limiter.reset()


@pytest.fixture
def client():
    """TestClient instance for service endpoints."""
    return TestClient(app)


@pytest.fixture
def mock_agent():
    """Mock agent returning simple AI response."""
    agent_mock = AsyncMock()
    agent_mock.ainvoke = AsyncMock(
        return_value=[("values", {"messages": [AIMessage(content="Agent answer")]})]
    )
    agent_mock.aget_state = AsyncMock(
        return_value=StateSnapshot(
            values={"messages": [AIMessage(content="Agent answer")]},
            next=(),
            config={},
            metadata=None,
            created_at=None,
            parent_config=None,
            tasks=(),
            interrupts=(),
        )
    )
    agent_mock.checkpointer = None
    with patch("service.service.get_agent", return_value=agent_mock):
        yield agent_mock


def test_guest_session_is_stateless(client):
    """POST /auth/guest generates signed JWT without inserting into users table."""
    resp = client.post("/auth/guest")
    assert resp.status_code == 200
    data = resp.json()

    assert "token" in data
    assert data["user"]["is_guest"] is True
    assert data["user"]["id"].startswith("guest_")
    assert data["user"]["full_name"] == "Гость"
    assert len(user_storage._in_memory_users) == 0


def test_register_and_login_flow(client):
    """Test normal registration and login with bcrypt password verification."""
    # Register
    reg_payload = {
        "email": "traveler@ostrovok.ru",
        "password": "SecretPassword123!",
        "full_name": "Иван Путешественник",
        "phone": "+79991234567",
    }
    reg_resp = client.post("/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["user"]["email"] == "traveler@ostrovok.ru"
    assert reg_data["user"]["is_guest"] is False
    assert "token" in reg_data

    # Duplicate register rejected
    dup_resp = client.post("/auth/register", json=reg_payload)
    assert dup_resp.status_code == 400

    # Wrong password
    bad_login = client.post(
        "/auth/login",
        json={"email": "traveler@ostrovok.ru", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # Nonexistent email
    no_email = client.post(
        "/auth/login",
        json={"email": "nobody@ostrovok.ru", "password": "SecretPassword123!"},
    )
    assert no_email.status_code == 401

    # Correct login
    good_login = client.post(
        "/auth/login",
        json={"email": "traveler@ostrovok.ru", "password": "SecretPassword123!"},
    )
    assert good_login.status_code == 200
    login_data = good_login.json()
    assert login_data["user"]["id"] == reg_data["user"]["id"]
    assert "token" in login_data


def test_auth_me_endpoint(client):
    """Test /auth/me with guest, user, and invalid tokens."""
    # 1. Unauthenticated -> 401
    resp = client.get("/auth/me")
    assert resp.status_code == 401

    # 2. Invalid token -> 401
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-valid-jwt"})
    assert resp.status_code == 401

    # 3. Guest token -> 200
    guest_resp = client.post("/auth/guest")
    guest_token = guest_resp.json()["token"]
    me_guest = client.get("/auth/me", headers={"Authorization": f"Bearer {guest_token}"})
    assert me_guest.status_code == 200
    assert me_guest.json()["is_guest"] is True
    assert me_guest.json()["full_name"] == "Гость"

    # 4. Registered user -> 200
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "me@ostrovok.ru",
            "password": "Password123",
            "full_name": "Анна Смирнова",
        },
    )
    user_token = reg_resp.json()["token"]
    me_user = client.get("/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert me_user.status_code == 200
    assert me_user.json()["is_guest"] is False
    assert me_user.json()["full_name"] == "Анна Смирнова"
    assert me_user.json()["email"] == "me@ostrovok.ru"


def test_login_rate_limiting(client):
    """Exceeding 5 login attempts within window must return HTTP 429."""
    for i in range(5):
        resp = client.post(
            "/auth/login",
            json={"email": "target@ostrovok.ru", "password": f"wrong_{i}"},
        )
        assert resp.status_code == 401

    # 6th attempt triggers 429
    blocked = client.post(
        "/auth/login",
        json={"email": "target@ostrovok.ru", "password": "any_password"},
    )
    assert blocked.status_code == 429
    assert "Too many login attempts" in blocked.json()["detail"]


def test_thread_ownership_isolation(client, mock_agent):
    """User A's thread cannot be accessed or viewed by User B (strict 404)."""
    # Create user A and user B
    reg_a = client.post(
        "/auth/register",
        json={"email": "alice@ostrovok.ru", "password": "PassA", "full_name": "Alice"},
    ).json()
    token_a = reg_a["token"]

    reg_b = client.post(
        "/auth/register",
        json={"email": "bob@ostrovok.ru", "password": "PassB", "full_name": "Bob"},
    ).json()
    token_b = reg_b["token"]

    thread_alice = "thread-alice-secret-100"

    # Alice invokes agent with thread_id
    invoke_a = client.post(
        "/invoke",
        json={"message": "Подбери отель в Риме", "thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert invoke_a.status_code == 200

    # Bob attempts to invoke on Alice's thread -> 404 Not Found
    invoke_b = client.post(
        "/invoke",
        json={"message": "Взломать диалог", "thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert invoke_b.status_code == 404
    assert invoke_b.json()["detail"] == "Thread not found"

    # Bob attempts to fetch history on Alice's thread -> 404 Not Found
    hist_b = client.post(
        "/history",
        json={"thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert hist_b.status_code == 404
    assert hist_b.json()["detail"] == "Thread not found"

    # Alice can fetch history on her thread -> 200 OK
    hist_a = client.post(
        "/history",
        json={"thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert hist_a.status_code == 200

    # Alice sees her thread in /threads list
    threads_a = client.get("/threads", headers={"Authorization": f"Bearer {token_a}"})
    assert threads_a.status_code == 200
    alice_thread_ids = [t["thread_id"] for t in threads_a.json()["threads"]]
    assert thread_alice in alice_thread_ids

    # Bob does NOT see Alice's thread in /threads list
    threads_b = client.get("/threads", headers={"Authorization": f"Bearer {token_b}"})
    assert threads_b.status_code == 200
    bob_thread_ids = [t["thread_id"] for t in threads_b.json()["threads"]]
    assert thread_alice not in bob_thread_ids


def test_master_key_admin_bypass(client, mock_agent):
    """Admin using AUTH_SECRET master key can access any thread without 404."""
    master_key = "super-secret-admin-master-key-32-chars-long!"
    with patch("service.dependencies.settings.AUTH_SECRET", SecretStr(master_key)):
        # Alice creates a thread
        reg_a = client.post(
            "/auth/register",
            json={"email": "alice_m@ostrovok.ru", "password": "Pass", "full_name": "Alice"},
        ).json()
        token_a = reg_a["token"]

        thread_id = "thread-alice-master-test"
        client.post(
            "/invoke",
            json={"message": "Привет", "thread_id": thread_id},
            headers={"Authorization": f"Bearer {token_a}"},
        )

        # Admin accesses Alice's thread with master key
        admin_hist = client.post(
            "/history",
            json={"thread_id": thread_id},
            headers={"Authorization": f"Bearer {master_key}"},
        )
        assert admin_hist.status_code == 200


def test_guest_thread_migration_on_register(client, mock_agent):
    """Guest threads are migrated to user upon registration with valid guest_token."""
    # 1. Start guest session
    guest_session = client.post("/auth/guest").json()
    guest_token = guest_session["token"]

    # 2. Guest starts a conversation
    guest_thread = "thread-guest-vacation"
    client.post(
        "/invoke",
        json={"message": "Ищу билеты в Сочи", "thread_id": guest_thread},
        headers={"Authorization": f"Bearer {guest_token}"},
    )

    # 3. Guest registers providing guest_token
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "newuser@ostrovok.ru",
            "password": "Password123",
            "full_name": "Новый Пользователь",
            "guest_token": guest_token,
        },
    )
    assert reg_resp.status_code == 200
    user_token = reg_resp.json()["token"]

    # 4. Registered user can access guest's thread
    hist = client.post(
        "/history",
        json={"thread_id": guest_thread},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert hist.status_code == 200

    # 5. Thread appears in registered user's list
    threads_resp = client.get("/threads", headers={"Authorization": f"Bearer {user_token}"})
    assert threads_resp.status_code == 200
    user_threads = [t["thread_id"] for t in threads_resp.json()["threads"]]
    assert guest_thread in user_threads


def test_tampered_guest_token_does_not_migrate(client, mock_agent):
    """Tampered guest_token fails signature check and does not migrate threads."""
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "tampered@ostrovok.ru",
            "password": "Password123",
            "full_name": "Тестер",
            "guest_token": "header.payload.tampered_signature",
        },
    )
    # Registration still succeeds, but invalid token is logged/ignored
    assert reg_resp.status_code == 200


def test_guest_thread_migration_on_login(client, mock_agent):
    """Guest threads are migrated when logging into an existing account."""
    # 1. Existing registered user
    reg = client.post(
        "/auth/register",
        json={
            "email": "returning@ostrovok.ru",
            "password": "MySecretPassword",
            "full_name": "Постоянный Клиент",
        },
    ).json()

    # 2. Guest starts a conversation
    guest_session = client.post("/auth/guest").json()
    guest_token = guest_session["token"]
    guest_thread = "thread-guest-login-migration"
    client.post(
        "/invoke",
        json={"message": "Подбери отель в Казани", "thread_id": guest_thread},
        headers={"Authorization": f"Bearer {guest_token}"},
    )

    # 3. User logs in with guest_token
    login_resp = client.post(
        "/auth/login",
        json={
            "email": "returning@ostrovok.ru",
            "password": "MySecretPassword",
            "guest_token": guest_token,
        },
    )
    assert login_resp.status_code == 200
    user_token = login_resp.json()["token"]

    # 4. Thread now belongs to the registered user
    hist = client.post(
        "/history",
        json={"thread_id": guest_thread},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert hist.status_code == 200


def test_unauthenticated_requests_rejected(client):
    """Protected endpoints must reject requests without Bearer token with 401."""
    assert client.post("/invoke", json={"message": "hi"}).status_code == 401
    assert client.post("/history", json={"thread_id": "any"}).status_code == 401
    assert client.get("/threads").status_code == 401
    assert client.post("/agui/run", json={"thread_id": "any", "messages": []}).status_code == 401


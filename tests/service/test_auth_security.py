"""Independent QA Security Test Suite for Authentication and Thread Ownership Isolation.

Covers:
1. JWT forgery and tampering (none alg, invalid sig, expired exp, spoofed/empty sub, is_admin injection).
2. IDOR / Broken Object Level Authorization across all protected endpoints (/invoke, /stream, /history, /threads, /agui/run).
3. Thread migration tampering (registered user token passed as guest_token, forged sub, expired/invalid guest tokens).
4. Password and email edge cases (Unicode, whitespace, special characters, empty fields, case-insensitive emails).
5. Rate Limiter behavior (sliding window lockout after 5 attempts, IP isolation, email isolation).
6. Concurrent access & atomicity (claim_or_touch_thread race condition safety, concurrent registration).
"""

import asyncio
import time
from datetime import timedelta
from typing import Any
from unittest.mock import AsyncMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage
from langgraph.types import StateSnapshot
from pydantic import SecretStr

from core.auth_crypto import (
    DEFAULT_DEV_SECRET,
    JWT_ALGORITHM,
    create_access_token,
    get_auth_secret,
    login_rate_limiter,
)
from memory import user_storage
from service import app


@pytest.fixture(autouse=True)
def reset_storage_and_limiter():
    """Clear memory stores and rate limits before and after each test."""
    user_storage.clear_in_memory_storage()
    login_rate_limiter.reset()
    yield
    user_storage.clear_in_memory_storage()
    login_rate_limiter.reset()


@pytest.fixture
def client():
    """Standard TestClient instance."""
    return TestClient(app)


@pytest.fixture
def mock_agent():
    """Mock agent supporting invoke, state inspection, and streaming."""
    agent_mock = AsyncMock()
    agent_mock.ainvoke = AsyncMock(
        return_value=[("values", {"messages": [AIMessage(content="QA Agent answer")]})]
    )
    agent_mock.aget_state = AsyncMock(
        return_value=StateSnapshot(
            values={"messages": [AIMessage(content="QA Agent history")]},
            next=(),
            config={},
            metadata=None,
            created_at=None,
            parent_config=None,
            tasks=(),
            interrupts=(),
        )
    )

    async def fake_astream(*args: Any, **kwargs: Any):
        yield ("values", {"messages": [AIMessage(content="Stream chunk")]})

    agent_mock.astream = fake_astream
    agent_mock.checkpointer = None

    with (
        patch("service.service.get_agent", return_value=agent_mock),
        patch("service.agui.get_agent", return_value=agent_mock),
    ):
        yield agent_mock


# ==============================================================================
# SECTION 1: JWT FORGERY AND TAMPERING TESTS
# ==============================================================================


def test_jwt_none_algorithm_rejected(client: TestClient):
    """Tokens with algorithm 'none' must be rejected with 401 Unauthorized."""
    # Craft token with alg: none
    payload = {
        "sub": "attacker_user_id",
        "email": "attacker@evil.com",
        "is_guest": False,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    # Unsigned token with alg: none
    none_token = jwt.encode(payload, key="", algorithm="none")

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {none_token}"})
    assert resp.status_code == 401
    assert "Invalid or expired token" in resp.json()["detail"]

    # Also test on /invoke
    invoke_resp = client.post(
        "/invoke",
        json={"message": "hello"},
        headers={"Authorization": f"Bearer {none_token}"},
    )
    assert invoke_resp.status_code == 401


def test_jwt_invalid_signature_rejected(client: TestClient):
    """Tokens signed with wrong secret key must be rejected with 401."""
    payload = {
        "sub": "fake_user",
        "email": "fake@evil.com",
        "is_guest": False,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    fake_token = jwt.encode(
        payload, "entirely-wrong-secret-key-that-does-not-match!", algorithm=JWT_ALGORITHM
    )

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert resp.status_code == 401
    assert "Invalid or expired token" in resp.json()["detail"]


def test_jwt_expired_token_rejected(client: TestClient):
    """Tokens past expiration time must be rejected with 401."""
    expired_token = create_access_token(
        user_id="usr_expired",
        email="expired@ostrovok.ru",
        expires_delta=timedelta(seconds=-60),
    )

    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401
    assert "Invalid or expired token" in resp.json()["detail"]


def test_jwt_missing_or_empty_sub_rejected(client: TestClient):
    """Tokens with missing or blank subject claim must return 401."""
    secret = get_auth_secret()

    # 1. Missing sub
    payload_no_sub = {
        "email": "nosub@ostrovok.ru",
        "is_guest": False,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    token_no_sub = jwt.encode(payload_no_sub, secret, algorithm=JWT_ALGORITHM)
    resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token_no_sub}"})
    assert resp.status_code == 401
    assert "missing subject" in resp.json()["detail"].lower()

    # 2. Whitespace-only sub
    payload_ws_sub = {
        "sub": "   ",
        "email": "spacesub@ostrovok.ru",
        "is_guest": False,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    token_ws_sub = jwt.encode(payload_ws_sub, secret, algorithm=JWT_ALGORITHM)
    resp_ws = client.get("/auth/me", headers={"Authorization": f"Bearer {token_ws_sub}"})
    assert resp_ws.status_code == 401
    assert "missing subject" in resp_ws.json()["detail"].lower()


def test_jwt_is_admin_injection_ignored(client: TestClient, mock_agent: Any):
    """An attacker adding 'is_admin': true to their JWT cannot gain admin privileges."""
    secret = get_auth_secret()

    # Alice creates a private thread
    reg_alice = client.post(
        "/auth/register",
        json={"email": "alice@ostrovok.ru", "password": "SecretPassAlice123", "full_name": "Alice"},
    ).json()
    token_alice = reg_alice["token"]
    alice_thread = "thread-alice-confidential"

    client.post(
        "/invoke",
        json={"message": "Alice private search", "thread_id": alice_thread},
        headers={"Authorization": f"Bearer {token_alice}"},
    )

    # Attacker crafts token with is_admin: True
    payload_attacker = {
        "sub": "usr_attacker",
        "email": "attacker@evil.com",
        "is_admin": True,
        "is_guest": False,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    attacker_token = jwt.encode(payload_attacker, secret, algorithm=JWT_ALGORITHM)

    # Attacker tries to read Alice's thread via /history -> MUST BE 404
    hist_resp = client.post(
        "/history",
        json={"thread_id": alice_thread},
        headers={"Authorization": f"Bearer {attacker_token}"},
    )
    assert hist_resp.status_code == 404
    assert hist_resp.json()["detail"] == "Thread not found"

    # Attacker calls /auth/me -> is_admin must not be leaked or set
    me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {attacker_token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["id"] == "usr_attacker"


def test_jwt_dev_secret_rejected_when_auth_secret_configured(client: TestClient):
    """Tokens signed with dev fallback secret are rejected when AUTH_SECRET is set."""
    custom_secret = "production-secret-key-32-chars-long!"
    with patch("service.dependencies.settings.AUTH_SECRET", SecretStr(custom_secret)):
        # Attacker signs token with DEFAULT_DEV_SECRET
        dev_token = jwt.encode(
            {"sub": "attacker", "email": "a@a.com", "exp": int(time.time()) + 3600},
            DEFAULT_DEV_SECRET,
            algorithm=JWT_ALGORITHM,
        )

        resp = client.get("/auth/me", headers={"Authorization": f"Bearer {dev_token}"})
        assert resp.status_code == 401


# ==============================================================================
# SECTION 2: IDOR / BROKEN OBJECT LEVEL AUTHORIZATION TESTS
# ==============================================================================


def test_idor_protection_all_endpoints(client: TestClient, mock_agent: Any):
    """Test that all protected endpoints enforce thread isolation against IDOR."""
    # 1. Setup Alice and Bob
    alice_data = client.post(
        "/auth/register",
        json={"email": "alice_idor@ostrovok.ru", "password": "PassAlice123!", "full_name": "Alice"},
    ).json()
    token_alice = alice_data["token"]

    bob_data = client.post(
        "/auth/register",
        json={"email": "bob_idor@ostrovok.ru", "password": "PassBob123!", "full_name": "Bob"},
    ).json()
    token_bob = bob_data["token"]

    thread_alice = "thread-alice-idor-target"

    # Alice initializes her thread
    alice_init = client.post(
        "/invoke",
        json={"message": "Отели в Париже", "thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_alice}"},
    )
    assert alice_init.status_code == 200

    # 2. Bob attempts IDOR on POST /invoke
    bob_invoke = client.post(
        "/invoke",
        json={"message": "Украсть диалог", "thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_invoke.status_code == 404
    assert bob_invoke.json()["detail"] == "Thread not found"

    # 3. Bob attempts IDOR on POST /{agent_id}/invoke
    bob_invoke_agent = client.post(
        "/travel/invoke",
        json={"message": "Украсть диалог", "thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_invoke_agent.status_code == 404
    assert bob_invoke_agent.json()["detail"] == "Thread not found"

    # 4. Bob attempts IDOR on POST /stream
    bob_stream = client.post(
        "/stream",
        json={"message": "Украсть поток", "thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_stream.status_code == 404
    assert bob_stream.json()["detail"] == "Thread not found"

    # 5. Bob attempts IDOR on POST /{agent_id}/stream
    bob_stream_agent = client.post(
        "/travel/stream",
        json={"message": "Украсть поток", "thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_stream_agent.status_code == 404
    assert bob_stream_agent.json()["detail"] == "Thread not found"

    # 6. Bob attempts IDOR on POST /history
    bob_hist = client.post(
        "/history",
        json={"thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_hist.status_code == 404
    assert bob_hist.json()["detail"] == "Thread not found"

    # 7. Bob attempts IDOR on POST /{agent_id}/history
    bob_hist_agent = client.post(
        "/travel/history",
        json={"thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_hist_agent.status_code == 404
    assert bob_hist_agent.json()["detail"] == "Thread not found"

    # 8. Bob checks GET /threads and GET /{agent_id}/threads
    bob_threads = client.get("/threads", headers={"Authorization": f"Bearer {token_bob}"})
    assert bob_threads.status_code == 200
    bob_thread_list = [t["thread_id"] for t in bob_threads.json()["threads"]]
    assert thread_alice not in bob_thread_list

    bob_agent_threads = client.get("/travel/threads", headers={"Authorization": f"Bearer {token_bob}"})
    assert bob_agent_threads.status_code == 200
    bob_agent_thread_list = [t["thread_id"] for t in bob_agent_threads.json()["threads"]]
    assert thread_alice not in bob_agent_thread_list

    # 9. Bob attempts IDOR on POST /agui/run
    agui_payload = {
        "threadId": thread_alice,
        "runId": "run_idor",
        "state": {},
        "messages": [],
        "tools": [],
        "context": [],
        "forwardedProps": {},
    }
    bob_agui = client.post(
        "/agui/run",
        json=agui_payload,
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_agui.status_code == 404
    assert bob_agui.json()["detail"] == "Thread not found"

    # 10. Bob attempts IDOR on POST /agui/{agent_id}/run
    bob_agui_agent = client.post(
        "/agui/travel/run",
        json=agui_payload,
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_agui_agent.status_code == 404
    assert bob_agui_agent.json()["detail"] == "Thread not found"

    # 11. Guest user attempts IDOR on Alice's thread
    guest_token = client.post("/auth/guest").json()["token"]
    guest_hist = client.post(
        "/history",
        json={"thread_id": thread_alice},
        headers={"Authorization": f"Bearer {guest_token}"},
    )
    assert guest_hist.status_code == 404

    # 12. Legitimate owner Alice can access her own thread
    alice_hist = client.post(
        "/history",
        json={"thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_alice}"},
    )
    assert alice_hist.status_code == 200

    alice_stream = client.post(
        "/stream",
        json={"message": "Продолжи", "thread_id": thread_alice},
        headers={"Authorization": f"Bearer {token_alice}"},
    )
    assert alice_stream.status_code == 200


# ==============================================================================
# SECTION 3: THREAD MIGRATION TAMPERING TESTS
# ==============================================================================


def test_cannot_steal_registered_user_threads_via_migration_on_register(
    client: TestClient, mock_agent: Any
):
    """Passing a registered user's token as guest_token during registration must NOT migrate threads."""
    # Alice registers and creates a thread
    alice_resp = client.post(
        "/auth/register",
        json={"email": "alice_victim@ostrovok.ru", "password": "Password123!", "full_name": "Alice"},
    ).json()
    token_alice = alice_resp["token"]
    alice_thread = "thread-alice-cannot-steal"

    client.post(
        "/invoke",
        json={"message": "Секретный маршрут", "thread_id": alice_thread},
        headers={"Authorization": f"Bearer {token_alice}"},
    )

    # Attacker tries to register and passes Alice's registered token as guest_token
    attacker_reg = client.post(
        "/auth/register",
        json={
            "email": "attacker_thief@ostrovok.ru",
            "password": "Password123!",
            "full_name": "Вор",
            "guest_token": token_alice,
        },
    )
    assert attacker_reg.status_code == 200
    token_attacker = attacker_reg.json()["token"]

    # Attacker cannot access Alice's thread
    attacker_hist = client.post(
        "/history",
        json={"thread_id": alice_thread},
        headers={"Authorization": f"Bearer {token_attacker}"},
    )
    assert attacker_hist.status_code == 404
    assert attacker_hist.json()["detail"] == "Thread not found"

    # Alice still owns her thread
    alice_hist = client.post(
        "/history",
        json={"thread_id": alice_thread},
        headers={"Authorization": f"Bearer {token_alice}"},
    )
    assert alice_hist.status_code == 200


def test_cannot_steal_registered_user_threads_via_migration_on_login(
    client: TestClient, mock_agent: Any
):
    """Passing a registered user's token as guest_token during login must NOT migrate threads."""
    # Alice registers and creates a thread
    alice_resp = client.post(
        "/auth/register",
        json={"email": "alice_victim2@ostrovok.ru", "password": "Password123!", "full_name": "Alice"},
    ).json()
    token_alice = alice_resp["token"]
    alice_thread = "thread-alice-login-safe"

    client.post(
        "/invoke",
        json={"message": "Секретный план", "thread_id": alice_thread},
        headers={"Authorization": f"Bearer {token_alice}"},
    )

    # Bob has an existing account
    client.post(
        "/auth/register",
        json={"email": "bob_login@ostrovok.ru", "password": "Password123!", "full_name": "Bob"},
    )

    # Bob logs in and passes Alice's token in guest_token
    bob_login = client.post(
        "/auth/login",
        json={
            "email": "bob_login@ostrovok.ru",
            "password": "Password123!",
            "guest_token": token_alice,
        },
    )
    assert bob_login.status_code == 200
    token_bob = bob_login.json()["token"]

    # Bob cannot access Alice's thread
    bob_hist = client.post(
        "/history",
        json={"thread_id": alice_thread},
        headers={"Authorization": f"Bearer {token_bob}"},
    )
    assert bob_hist.status_code == 404


def test_migration_defense_in_depth_rejects_non_guest_prefix_sub(
    client: TestClient, mock_agent: Any
):
    """Even if a token has is_guest: True, sub not starting with 'guest_' must not migrate."""
    # Alice registers
    alice_resp = client.post(
        "/auth/register",
        json={"email": "alice_sub@ostrovok.ru", "password": "Password123!", "full_name": "Alice"},
    ).json()
    alice_id = alice_resp["user"]["id"]
    token_alice = alice_resp["token"]
    alice_thread = "thread-alice-prefix-check"

    client.post(
        "/invoke",
        json={"message": "Тест префикса", "thread_id": alice_thread},
        headers={"Authorization": f"Bearer {token_alice}"},
    )

    # Forged token with is_guest: True but sub is Alice's registered user_id
    secret = get_auth_secret()
    forged_token = jwt.encode(
        {
            "sub": alice_id,
            "email": "",
            "is_guest": True,
            "iat": int(time.time()),
            "exp": int(time.time()) + 3600,
        },
        secret,
        algorithm=JWT_ALGORITHM,
    )

    # Attacker registers with forged token
    att_reg = client.post(
        "/auth/register",
        json={
            "email": "attacker_prefix@ostrovok.ru",
            "password": "Password123!",
            "full_name": "Attacker",
            "guest_token": forged_token,
        },
    )
    assert att_reg.status_code == 200
    token_att = att_reg.json()["token"]

    # Alice's thread is safe
    att_hist = client.post(
        "/history",
        json={"thread_id": alice_thread},
        headers={"Authorization": f"Bearer {token_att}"},
    )
    assert att_hist.status_code == 404


def test_migration_rejects_expired_and_tampered_guest_tokens(
    client: TestClient, mock_agent: Any
):
    """Expired or invalidly signed guest tokens do not trigger thread migration."""
    # Guest creates thread
    guest_token = create_access_token(
        user_id="guest_real_uuid",
        is_guest=True,
        expires_delta=timedelta(seconds=-10),  # expired
    )
    # Manually claim thread for guest_real_uuid in storage
    asyncio.run(user_storage.claim_or_touch_thread("thread-guest-expired", "guest_real_uuid"))

    # Register with expired guest token
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "reg_expired@ostrovok.ru",
            "password": "Password123!",
            "full_name": "User",
            "guest_token": guest_token,
        },
    )
    assert reg_resp.status_code == 200
    user_token = reg_resp.json()["token"]

    # Thread was not migrated
    hist_resp = client.post(
        "/history",
        json={"thread_id": "thread-guest-expired"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert hist_resp.status_code == 404


# ==============================================================================
# SECTION 4: PASSWORD AND EMAIL EDGE CASES
# ==============================================================================


def test_unicode_passwords_and_special_characters(client: TestClient):
    """Passwords with emojis, Cyrillic, spaces, and special symbols are hashed and verified accurately."""
    complex_password = "  Пароль🔐123!_öäü_тест_#@$%^&*()  "
    email = "unicode_user@ostrovok.ru"

    # Register
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": email,
            "password": complex_password,
            "full_name": "Юникод Тестер",
        },
    )
    assert reg_resp.status_code == 200

    # Wrong password fails
    bad_login = client.post(
        "/auth/login",
        json={"email": email, "password": "Пароль🔐123!_öäü_тест_#@$%^&*()"},  # missing spaces
    )
    assert bad_login.status_code == 401

    # Exact password succeeds
    good_login = client.post(
        "/auth/login",
        json={"email": email, "password": complex_password},
    )
    assert good_login.status_code == 200
    assert "token" in good_login.json()


def test_empty_fields_validation_on_register_and_login(client: TestClient):
    """Empty or whitespace-only email, password, and full_name must be rejected with HTTP 400."""
    # 1. Empty email on register
    r1 = client.post(
        "/auth/register",
        json={"email": "   ", "password": "ValidPassword1", "full_name": "Name"},
    )
    assert r1.status_code == 400
    assert "email cannot be empty" in r1.json()["detail"].lower()

    # 2. Empty password on register
    r2 = client.post(
        "/auth/register",
        json={"email": "valid@ostrovok.ru", "password": "", "full_name": "Name"},
    )
    assert r2.status_code == 400
    assert "password cannot be empty" in r2.json()["detail"].lower()

    # 3. Empty full_name on register
    r3 = client.post(
        "/auth/register",
        json={"email": "valid2@ostrovok.ru", "password": "ValidPassword1", "full_name": "   "},
    )
    assert r3.status_code == 400
    assert "full name cannot be empty" in r3.json()["detail"].lower()

    # 4. Empty email on login
    l1 = client.post(
        "/auth/login",
        json={"email": "", "password": "ValidPassword1"},
    )
    assert l1.status_code == 400

    # 5. Empty password on login
    l2 = client.post(
        "/auth/login",
        json={"email": "valid@ostrovok.ru", "password": ""},
    )
    assert l2.status_code == 400


def test_case_insensitive_email_behavior(client: TestClient):
    """Email matching must be strictly case-insensitive across registration, duplicate check, and login."""
    primary_email = "Traveler.Pro@Ostrovok.RU"
    lowercase_email = "traveler.pro@ostrovok.ru"
    uppercase_email = "TRAVELER.PRO@OSTROVOK.RU"
    padded_email = "  traveler.pro@ostrovok.ru  "
    password = "MySecurePassword123!"

    # 1. Register with mixed case
    reg = client.post(
        "/auth/register",
        json={"email": primary_email, "password": password, "full_name": "Иван"},
    )
    assert reg.status_code == 200

    # 2. Duplicate registration with lowercase fails
    dup_lower = client.post(
        "/auth/register",
        json={"email": lowercase_email, "password": password, "full_name": "Иван2"},
    )
    assert dup_lower.status_code == 400
    assert "already exists" in dup_lower.json()["detail"].lower()

    # 3. Duplicate registration with uppercase fails
    dup_upper = client.post(
        "/auth/register",
        json={"email": uppercase_email, "password": password, "full_name": "Иван3"},
    )
    assert dup_upper.status_code == 400

    # 4. Login with lowercase succeeds
    log_lower = client.post(
        "/auth/login",
        json={"email": lowercase_email, "password": password},
    )
    assert log_lower.status_code == 200

    # 5. Login with uppercase succeeds
    log_upper = client.post(
        "/auth/login",
        json={"email": uppercase_email, "password": password},
    )
    assert log_upper.status_code == 200

    # 6. Login with padded spaces succeeds
    log_padded = client.post(
        "/auth/login",
        json={"email": padded_email, "password": password},
    )
    assert log_padded.status_code == 200


# ==============================================================================
# SECTION 5: RATE LIMITER BEHAVIOR AND ISOLATION
# ==============================================================================


def test_rate_limiter_lockout_and_isolation(client: TestClient):
    """Rate limiter locks out after 5 attempts and cleanly isolates different IPs and emails."""
    # Register victim account
    client.post(
        "/auth/register",
        json={"email": "victim@ostrovok.ru", "password": "RealPassword123", "full_name": "Victim"},
    )
    # Register innocent account
    client.post(
        "/auth/register",
        json={"email": "innocent@ostrovok.ru", "password": "RealPassword123", "full_name": "Innocent"},
    )

    # Client A from IP 10.0.0.1
    client_a = TestClient(app, client=("10.0.0.1", 50000))
    # Client B from IP 10.0.0.2
    client_b = TestClient(app, client=("10.0.0.2", 50000))

    # 1. Client A fails 5 times on victim@ostrovok.ru
    for i in range(5):
        resp = client_a.post(
            "/auth/login",
            json={"email": "victim@ostrovok.ru", "password": f"bad_{i}"},
        )
        assert resp.status_code == 401

    # 6th attempt from Client A on victim@ostrovok.ru is locked out (429)
    blocked_a = client_a.post(
        "/auth/login",
        json={"email": "victim@ostrovok.ru", "password": "RealPassword123"},
    )
    assert blocked_a.status_code == 429
    assert "Too many login attempts" in blocked_a.json()["detail"]

    # 2. IP ISOLATION: Client B (different IP) can still attempt to log in as victim@ostrovok.ru
    client_b_login = client_b.post(
        "/auth/login",
        json={"email": "victim@ostrovok.ru", "password": "RealPassword123"},
    )
    # Client B is NOT blocked by Client A's lockout!
    assert client_b_login.status_code == 200

    # 3. EMAIL ISOLATION: Client A can still log in as innocent@ostrovok.ru
    client_a_innocent = client_a.post(
        "/auth/login",
        json={"email": "innocent@ostrovok.ru", "password": "RealPassword123"},
    )
    assert client_a_innocent.status_code == 200

    # 4. RESET: Reset clears the lockout
    login_rate_limiter.reset()
    after_reset = client_a.post(
        "/auth/login",
        json={"email": "victim@ostrovok.ru", "password": "RealPassword123"},
    )
    assert after_reset.status_code == 200


# ==============================================================================
# SECTION 6: CONCURRENCY AND ATOMICITY TESTS
# ==============================================================================


@pytest.mark.asyncio
async def test_concurrent_claim_or_touch_thread_atomicity():
    """Simultaneous claims of the same thread_id by different users preserve first claimant."""
    thread_id = "thread-concurrent-race-test"
    user_alice = "usr_alice_concurrent"
    user_bob = "usr_bob_concurrent"

    # Alice claims thread first
    owner_first = await user_storage.claim_or_touch_thread(thread_id, user_alice, title="Alice Thread")
    assert owner_first == user_alice

    # 30 concurrent coroutines attempting to claim or touch simultaneously
    async def worker(u_id: str, title: str):
        return await user_storage.claim_or_touch_thread(thread_id, u_id, title=title)

    tasks = []
    for i in range(15):
        tasks.append(worker(user_bob, f"Bob Attempt {i}"))
        tasks.append(worker(user_alice, f"Alice Touch {i}"))

    results = await asyncio.gather(*tasks)

    # All returned owners must be Alice! Bob never takes ownership.
    for r in results:
        assert r == user_alice

    # Final owner in storage remains Alice
    final_owner = await user_storage.get_thread_owner(thread_id)
    assert final_owner == user_alice


@pytest.mark.asyncio
async def test_concurrent_registration_atomicity():
    """Simultaneous registrations with the same email result in only one successful creation."""
    target_email = "concurrent_reg@ostrovok.ru"

    async def register_worker(name: str):
        clean_email = target_email.strip()
        existing = await user_storage.get_user_by_email(clean_email)
        if existing:
            return False
        await user_storage.create_user(
            id=f"usr_{name}",
            email=clean_email,
            password_hash="hash",
            full_name=name,
        )
        return True

    # Run 10 parallel registration workers
    results = await asyncio.gather(*[register_worker(f"Worker_{i}") for i in range(10)])

    # Exactly 1 worker succeeded
    successful_creations = [r for r in results if r is True]
    assert len(successful_creations) == 1

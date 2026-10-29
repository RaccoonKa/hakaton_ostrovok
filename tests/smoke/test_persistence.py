import os

import httpx
import pytest

# Shared with scripts/smoke_test.sh via the environment so the script can verify
# this exact thread's checkpoints landed in the intended backend. Falls back to a
# fixed id when the test is run on its own.
THREAD_ID = os.environ.get("SMOKE_THREAD_ID", "smoke-test-persistence-thread")
SERVICE_URL = os.environ.get("SERVICE_URL", "http://localhost:8000")


class ServiceSmokeClient:
    """Lightweight client for smoke persistence testing with Bearer auth."""

    def __init__(self, base_url: str = SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.http = httpx.Client(base_url=self.base_url, timeout=30.0)
        # Получаем гостевую сессию
        resp = self.http.post("/auth/guest")
        token = resp.json().get("token") if resp.status_code == 200 else ""
        self.headers = {"Authorization": f"Bearer {token}"} if token else {}

    def invoke(
        self,
        message: str,
        thread_id: str,
        user_id: str | None = None,
        model: str = "fake",
    ) -> dict:
        payload = {"message": message, "thread_id": thread_id, "model": model}
        if user_id:
            payload["user_id"] = user_id
        resp = self.http.post("/invoke", json=payload, headers=self.headers)
        resp.raise_for_status()
        return resp.json()

    def get_history(self, thread_id: str) -> dict:
        resp = self.http.post("/history", json={"thread_id": thread_id}, headers=self.headers)
        resp.raise_for_status()
        return resp.json()

    def get_user_threads(self, user_id: str | None = None) -> dict:
        params = {"user_id": user_id} if user_id else {}
        resp = self.http.get("/threads", params=params, headers=self.headers)
        resp.raise_for_status()
        return resp.json()


@pytest.mark.docker
def test_checkpointer_persists_history():
    """Confirm the configured checkpointer persists conversation state across turns.

    Backend-agnostic: exercises whichever DATABASE_TYPE the service was started
    with. Requires a running service (USE_FAKE_MODEL=true) backed by a live database.
    """
    client = ServiceSmokeClient()

    client.invoke("Tell me a joke?", thread_id=THREAD_ID, model="fake")
    client.invoke("Tell me another?", thread_id=THREAD_ID, model="fake")

    history = client.get_history(thread_id=THREAD_ID)
    human_messages = [m for m in history.get("messages", []) if m.get("type") == "human"]
    assert len(human_messages) == 2
    assert human_messages[0].get("content") == "Tell me a joke?"
    assert human_messages[1].get("content") == "Tell me another?"


@pytest.mark.docker
def test_threads_lists_user_threads():
    """Confirm /threads enumerates threads through the configured checkpointer.

    Requires a running service (USE_FAKE_MODEL=true) backed by a live database.
    """
    client = ServiceSmokeClient()
    user_id = f"{THREAD_ID}-user"
    other_user_id = f"{THREAD_ID}-other"

    single_turn = f"{THREAD_ID}-single"
    multi_turn = f"{THREAD_ID}-multi"
    client.invoke("Only turn", thread_id=single_turn, user_id=user_id, model="fake")
    client.invoke("First turn", thread_id=multi_turn, user_id=user_id, model="fake")
    client.invoke("Second turn", thread_id=multi_turn, user_id=user_id, model="fake")
    client.invoke("Not mine", thread_id=f"{THREAD_ID}-other", user_id=other_user_id, model="fake")

    threads = client.get_user_threads(user_id=user_id).get("threads", [])
    # Most recently updated first; the single-turn thread must be listed even though
    # it never advanced past its head checkpoint.
    assert [t["thread_id"] for t in threads] == [multi_turn, single_turn]
    assert [t["title"] for t in threads] == ["First turn", "Only turn"]
    assert all(t.get("updated_at") for t in threads)

    other_threads = client.get_user_threads(user_id=other_user_id).get("threads", [])
    assert [t["thread_id"] for t in other_threads] == [f"{THREAD_ID}-other"]

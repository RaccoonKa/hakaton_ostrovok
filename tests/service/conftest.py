from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage
from langgraph.types import StateSnapshot

from core.auth_crypto import create_access_token, login_rate_limiter
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
def auth_token() -> str:
    """Fixture to create a valid JWT access token for testing."""
    return create_access_token(user_id="user-123", email="user123@example.com")


@pytest.fixture
def auth_headers(auth_token: str) -> dict[str, str]:
    """Fixture to provide authorization headers."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def test_client(auth_headers: dict[str, str]):
    """Fixture to create a FastAPI test client with default auth headers."""
    return TestClient(app, headers=auth_headers)


@pytest.fixture
def mock_agent():
    """Fixture to create a mock agent that can be configured for different test scenarios."""
    agent_mock = AsyncMock()
    agent_mock.ainvoke = AsyncMock(
        return_value=[("values", {"messages": [AIMessage(content="Test response")]})]
    )
    agent_mock.aget_state = AsyncMock(
        return_value=StateSnapshot(
            values={},
            next=(),
            config={},
            metadata=None,
            created_at=None,
            parent_config=None,
            tasks=(),
            interrupts=(),
        )
    )
    # Tests that exercise checkpointer reads set this explicitly; otherwise AsyncMock would
    # auto-create an attribute that looks like a working checkpointer.
    agent_mock.checkpointer = None
    with patch("service.service.get_agent", Mock(return_value=agent_mock)):
        yield agent_mock


@pytest.fixture
def mock_settings(mock_env):
    """Fixture to ensure settings are clean for each test."""
    with patch("service.service.settings") as mock_settings:
        yield mock_settings


@pytest.fixture
def mock_httpx(auth_headers: dict[str, str]):
    """Patch httpx.stream and httpx.get to use our test client."""

    with TestClient(app, headers=auth_headers) as client:

        def mock_stream(method: str, url: str, **kwargs):
            # Strip the base URL since TestClient expects just the path
            path = url.replace("http://0.0.0.0", "")
            return client.stream(method, path, **kwargs)

        def mock_get(url: str, **kwargs):
            # Strip the base URL since TestClient expects just the path
            path = url.replace("http://0.0.0.0", "")
            return client.get(path, **kwargs)

        with patch("httpx.stream", mock_stream):
            with patch("httpx.get", mock_get):
                yield

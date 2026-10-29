from unittest.mock import patch

import pytest
from langchain_gigachat.chat_models import GigaChat
from pydantic import SecretStr

from core.llm import get_model
from schema.models import GigaChatModelName

_get_model_uncached = get_model.__wrapped__


def test_get_model_gigachat():
    with patch("core.llm.settings.GIGACHAT_CREDENTIALS", SecretStr("test_credentials")):
        model = _get_model_uncached(GigaChatModelName.GIGACHAT_2)
        assert isinstance(model, GigaChat)
        assert model.model == "GigaChat-2"
        assert model.verify_ssl_certs is False
        assert model.scope == "GIGACHAT_API_PERS"
        assert model.streaming is True


def test_get_model_gigachat_pro():
    with patch("core.llm.settings.GIGACHAT_CREDENTIALS", SecretStr("test_credentials")):
        model = _get_model_uncached(GigaChatModelName.GIGACHAT_2_PRO)
        assert isinstance(model, GigaChat)
        assert model.model == "GigaChat-2-Pro"
        assert model.streaming is True


def test_get_model_gigachat_requires_credentials():
    with patch("core.llm.settings.GIGACHAT_CREDENTIALS", None):
        with pytest.raises(ValueError, match="GigaChat credentials must be configured"):
            _get_model_uncached(GigaChatModelName.GIGACHAT_2)


def test_get_model_invalid():
    with pytest.raises(ValueError, match="Unsupported model:"):
        get_model("invalid_model")  # type: ignore


def test_get_model_caching():
    with patch("core.llm.settings.GIGACHAT_CREDENTIALS", SecretStr("test_credentials")):
        m1 = get_model(GigaChatModelName.GIGACHAT_2)
        m2 = get_model(GigaChatModelName.GIGACHAT_2)
        assert m1 is m2

import logging
import os
from unittest.mock import patch

import pytest
from pydantic import SecretStr, ValidationError

from core.settings import LogLevel, Settings, check_str_is_http
from schema.models import GigaChatModelName


def test_check_str_is_http():
    # Test valid HTTP URLs
    assert check_str_is_http("http://example.com/") == "http://example.com/"
    assert check_str_is_http("https://api.test.com/") == "https://api.test.com/"

    # Test invalid URLs
    with pytest.raises(ValidationError):
        check_str_is_http("not_a_url")
    with pytest.raises(ValidationError):
        check_str_is_http("ftp://invalid.com")


def test_settings_default_values():
    settings = Settings(GIGACHAT_CREDENTIALS="test_key", _env_file=None)
    assert settings.HOST == "0.0.0.0"
    assert settings.PORT == 8080
    assert settings.LOG_LEVEL == LogLevel.WARNING
    assert settings.DEFAULT_MODEL == GigaChatModelName.GIGACHAT_2
    assert settings.AVAILABLE_MODELS == set(GigaChatModelName)


def test_settings_no_api_keys():
    # Test that settings raises error when no API keys are provided
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="At least one LLM API key must be provided"):
            _ = Settings(_env_file=None)


def test_settings_with_gigachat_credentials():
    with patch.dict(os.environ, {"GIGACHAT_CREDENTIALS": "test_cred"}, clear=True):
        settings = Settings(_env_file=None)
        assert settings.GIGACHAT_CREDENTIALS == SecretStr("test_cred")
        assert settings.DEFAULT_MODEL == GigaChatModelName.GIGACHAT_2
        assert settings.AVAILABLE_MODELS == set(GigaChatModelName)
        assert "test_cred" not in repr(settings)


def test_settings_explicit_default_model():
    with patch.dict(os.environ, {"GIGACHAT_CREDENTIALS": "test_cred"}, clear=True):
        settings = Settings(DEFAULT_MODEL=GigaChatModelName.GIGACHAT_3_PRO, _env_file=None)
        assert settings.DEFAULT_MODEL == GigaChatModelName.GIGACHAT_3_PRO


def test_settings_base_url():
    settings = Settings(GIGACHAT_CREDENTIALS="test_key", HOST="0.0.0.0", PORT=8000, _env_file=None)
    assert settings.BASE_URL == "http://0.0.0.0:8000"


def test_settings_is_dev():
    settings = Settings(GIGACHAT_CREDENTIALS="test_key", MODE="dev", _env_file=None)
    assert settings.is_dev() is True

    settings = Settings(GIGACHAT_CREDENTIALS="test_key", MODE="prod", _env_file=None)
    assert settings.is_dev() is False


def test_log_level_enum():
    """Test LogLevel enum and its conversion to logging levels."""
    assert LogLevel.DEBUG.to_logging_level() == logging.DEBUG
    assert LogLevel.INFO.to_logging_level() == logging.INFO
    assert LogLevel.WARNING.to_logging_level() == logging.WARNING
    assert LogLevel.ERROR.to_logging_level() == logging.ERROR
    assert LogLevel.CRITICAL.to_logging_level() == logging.CRITICAL


def test_settings_log_level_default():
    """Test that LOG_LEVEL defaults to WARNING."""
    with patch.dict(os.environ, {"GIGACHAT_CREDENTIALS": "test_key"}, clear=True):
        settings = Settings(_env_file=None)
        assert settings.LOG_LEVEL == LogLevel.WARNING
        assert settings.LOG_LEVEL.to_logging_level() == logging.WARNING


def test_settings_log_level_from_env():
    """Test that LOG_LEVEL can be set from environment variable."""
    with patch.dict(
        os.environ,
        {"GIGACHAT_CREDENTIALS": "test_key", "LOG_LEVEL": "DEBUG"},
        clear=True,
    ):
        settings = Settings(_env_file=None)
        assert settings.LOG_LEVEL == LogLevel.DEBUG
        assert settings.LOG_LEVEL.to_logging_level() == logging.DEBUG


def test_settings_log_level_invalid():
    with patch.dict(
        os.environ,
        {"GIGACHAT_CREDENTIALS": "test_key", "LOG_LEVEL": "INVALID"},
        clear=True,
    ):
        with pytest.raises(ValueError, match="validation error for Settings\nLOG_LEVEL\n"):
            Settings(_env_file=None)

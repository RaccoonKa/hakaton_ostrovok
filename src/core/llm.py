from functools import cache

from langchain_gigachat.chat_models import GigaChat

from core.settings import settings
from schema.models import (
    AllModelEnum,
    GigaChatModelName,
)

_MODEL_TABLE = {m: m.value for m in GigaChatModelName}

type ModelT = GigaChat


@cache
def get_model(model_name: AllModelEnum, /) -> ModelT:
    api_model_name = _MODEL_TABLE.get(model_name)
    if not api_model_name:
        raise ValueError(f"Unsupported model: {model_name}")

    if model_name in GigaChatModelName:
        if not settings.GIGACHAT_CREDENTIALS:
            raise ValueError("GigaChat credentials must be configured")

        return GigaChat(
            credentials=settings.GIGACHAT_CREDENTIALS.get_secret_value(),
            model=api_model_name,
            verify_ssl_certs=False,
            scope="GIGACHAT_API_PERS",
            streaming=True,
        )

    raise ValueError(f"Unsupported model: {model_name}")

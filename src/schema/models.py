from enum import StrEnum, auto


class Provider(StrEnum):
    GIGACHAT = auto()


class GigaChatModelName(StrEnum):
    GIGACHAT_2 = "GigaChat-2"
    GIGACHAT_2_PRO = "GigaChat-2-Pro"
    GIGACHAT_2_MAX = "GigaChat-2-Max"
    GIGACHAT_3_LIGHTNING = "GigaChat-3-Lightning"
    GIGACHAT_3_PRO = "GigaChat-3-Pro"
    GIGACHAT_3_ULTRA = "GigaChat-3-Ultra"


type AllModelEnum = GigaChatModelName

__all__ = [
    "AllModelEnum",
    "GigaChatModelName",
    "Provider",
]

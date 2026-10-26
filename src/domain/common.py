"""
Общие типы и перечисления домена Travel Agent.

Здесь собраны базовые `Enum`, которые используются несколькими
доменными моделями (перелёт, отель, транспорт, запрос пользователя).
"""

from enum import StrEnum


class Currency(StrEnum):
    """Валюта, в которой указана стоимость."""

    RUB = "RUB"
    USD = "USD"
    EUR = "EUR"
    TRY = "TRY"
    AED = "AED"
    GEL = "GEL"
    THB = "THB"
    EGP = "EGP"
    CNY = "CNY"
    KZT = "KZT"


class Priority(StrEnum):
    """Приоритет пользовательского пожелания."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TransportType(StrEnum):
    """Способ перемещения между точками маршрута."""

    PLANE = "plane"
    TRAIN = "train"
    BUS = "bus"
    CAR = "car"
    FERRY = "ferry"
    TAXI = "taxi"
    SHUTTLE = "shuttle"
    OTHER = "other"


class MealPlan(StrEnum):
    """Тип питания, включённый в проживание в отеле."""

    ROOM_ONLY = "room_only"
    BREAKFAST = "breakfast"
    HALF_BOARD = "half_board"
    FULL_BOARD = "full_board"
    ALL_INCLUSIVE = "all_inclusive"


class Season(StrEnum):
    SPRING = "spring"
    SUMMER = "summer"
    AUTUMN = "autumn"
    WINTER = "winter"


class Month(StrEnum):
    JANUARY = "january"
    FEBRUARY = "february"
    MARCH = "march"
    APRIL = "april"
    MAY = "may"
    JUNE = "june"
    JULY = "july"
    AUGUST = "august"
    SEPTEMBER = "september"
    OCTOBER = "october"
    NOVEMBER = "november"
    DECEMBER = "december"
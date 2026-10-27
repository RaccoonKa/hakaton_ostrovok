"""
Доменная модель структурированного запроса пользователя.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from domain.common import Currency, TransportType
from domain.constraint import Constraint
from domain.preference import DatePreferences, Preference


class UserRequest(BaseModel):
    """Структурированное представление исходного запроса пользователя.

    Содержит только требования и пожелания пользователя.
    Конкретные найденные Flight/Hotel/Transport сюда не добавляются.
    """

    model_config = ConfigDict(extra="forbid")

    origin: str | None = Field(
        description="Город/точка отправления.",
        default=None,
        examples=["Moscow"],
    )
    destination: str | None = Field(
        description="Желаемое направление (город или страна). Может быть не задано.",
        default=None,
        examples=["Antalya"],
    )
    destination_country: str | None = Field(
        description="Страна направления, если пользователь указал только страну.",
        default=None,
        examples=["Italy"],
    )
    destination_ambiguous: bool = Field(
        description=(
            "Пользователь упомянул несколько возможных городов и не выбрал один. "
            "Направление считается невыбранным."
        ),
        default=False,
    )
    date_preferences: DatePreferences = Field(
        default_factory=DatePreferences,
        description="Предпочтения пользователя по датам и периоду поездки.",
    )
    duration: int | None = Field(
        description="Желаемая длительность поездки в днях.",
        default=None,
        examples=[7],
    )
    travelers: int = Field(
        description=(
            "Количество путешественников (расчётное значение; для диапазона — максимум). "
            "Само по себе не доказывает, что пользователь его указывал."
        ),
        default=1,
        examples=[2],
    )
    traveler_range: tuple[int, int] | None = Field(
        description="Диапазон количества путешественников (минимум, максимум).",
        default=None,
        examples=[[2, 5]],
    )
    travelers_provided: bool = Field(
        description=(
            "Пользователь явно указал число путешественников (или диапазон). "
            "Отсутствие флага означает: значение по умолчанию не является ответом."
        ),
        default=False,
    )
    adults: int | None = Field(
        description="Количество взрослых, если пользователь разделил состав группы.",
        default=None,
    )
    children: int | None = Field(
        description="Количество детей, если пользователь разделил состав группы.",
        default=None,
    )
    budget: float | None = Field(
        description="Желаемый бюджет поездки (точная сумма).",
        default=None,
        examples=[150000],
    )
    budget_range: tuple[float, float] | None = Field(
        description=(
            "Диапазон бюджета (минимум, максимум). Нижняя граница сохраняется "
            "для интерпретации/ранжирования, верхняя используется как лимит."
        ),
        default=None,
        examples=[[100000, 200000]],
    )
    budget_mode: Literal["unknown", "specified", "no_limit", "flexible_scenarios"] = Field(
        description=(
            "Семантика бюджета: unknown — не обработан; specified — заданная сумма/диапазон; "
            "no_limit — пользователь не ограничивает; flexible_scenarios — подобрать разные уровни."
        ),
        default="unknown",
    )
    currency: Currency | None = Field(
        description="Валюта бюджета.",
        default=None,
    )
    preferences: list[Preference] = Field(
        description="Список пожеланий пользователя.",
        default=[],
    )
    preference_status: Literal["unknown", "specified", "no_preference"] = Field(
        description=(
            "Статус предпочтений: unknown — ещё не обработаны; specified — заданы; "
            "no_preference — пользователь явно отказался от предпочтений."
        ),
        default="unknown",
    )
    constraints: list[Constraint] = Field(
        description="Список ограничений пользователя.",
        default=[],
    )
    preferred_transport: TransportType | None = Field(
        description="Предпочитаемый способ перемещения.",
        default=None,
    )
    hotel_requirements: list[str] = Field(
        description="Требования к отелю.",
        default=[],
        examples=[["pool", "breakfast", "sea_view"]],
    )
    excluded_destinations: list[str] = Field(
        description="Список исключённых направлений/городов.",
        default=[],
    )
    excluded_countries: list[str] = Field(
        description="Список исключённых стран.",
        default=[],
    )

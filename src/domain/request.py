"""
Доменная модель структурированного запроса пользователя.
"""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from domain.common import Currency, TransportType
from domain.constraint import Constraint
from domain.preference import Preference, DatePreferences


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
        description="Количество путешественников.",
        default=1,
        examples=[2],
    )
    budget: float | None = Field(
        description="Желаемый бюджет поездки.",
        default=None,
        examples=[150000],
    )
    budget_range: tuple[float, float] | None = Field(
        description="Диапазон бюджета (минимум, максимум).",
        default=None,
        examples=[[100000, 200000]],
    )
    currency: Currency | None = Field(
        description="Валюта бюджета.",
        default=None,
    )
    preferences: list[Preference] = Field(
        description="Список пожеланий пользователя.",
        default=[],
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

"""
Доменная модель пользовательского пожелания.
"""

from pydantic import BaseModel, ConfigDict, Field
from datetime import date
from domain.common import Priority, Season, Month


class Preference(BaseModel):
    """Пожелание пользователя (например, beach, romance, history)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(
        description="Название пожелания.",
        examples=["beach", "romance", "history", "nature", "nightlife", "family", "warm_weather"],
    )
    priority: Priority = Field(
        description="Приоритет пожелания.",
        default=Priority.MEDIUM,
    )


class DatePreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exact_dates: list[date] | None = Field(
        default=None,
        description="Конкретные даты поездки, если известны.",
    )
    start_date: date | None = Field(
        default=None,
        description="Начало допустимого периода поездки.",
    )
    end_date: date | None = Field(
        default=None,
        description="Конец допустимого периода поездки.",
    )
    season: list[Season] | None = Field(
        default=None,
        description="Желаемый сезон/сезоны поездки",
    )
    month: list[Month] | None = Field(
        default=None,
        description="Желаемый месяц/месяца поездки",
    )
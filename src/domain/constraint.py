"""
Доменная модель пользовательского ограничения.
"""

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Constraint(BaseModel):
    """Ограничение пользователя (например, максимальный бюджет или отсутствие пересадок)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(
        description="Название ограничения.",
        examples=["max_budget", "max_flight_duration", "no_stops", "specific_date", "breakfast"],
    )
    value: Any = Field(
        description="Значение ограничения.",
        default=None,
        examples=[100000, 6, True, "2026-07-01"],
    )
    hard: bool = Field(
        description="Жёсткое ли ограничение. True означает, что нарушать его нельзя.",
        default=False,
    )

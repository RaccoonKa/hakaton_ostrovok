"""
Доменная модель трансфера между конкретными точками.
"""

from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field

from domain.common import Currency, TransportType


class Transfer(BaseModel):
    """Трансфер между конкретными точками (например, airport -> hotel)."""

    model_config = ConfigDict(extra="forbid")

    origin: str = Field(
        description="Точка отправления трансфера.",
        examples=["Antalya Airport"],
    )
    destination: str = Field(
        description="Точка прибытия трансфера.",
        examples=["Rixos Downtown"],
    )
    departure_at: datetime = Field(
        description="Дата и время начала трансфера.",
        examples=["2026-07-01T15:30:00+03:00"],
    )
    arrival_at: datetime = Field(
        description="Дата и время завершения трансфера.",
        examples=["2026-07-01T16:15:00+03:00"],
    )
    duration: timedelta | None = Field(
        description="Длительность трансфера.",
        default=None,
        examples=["PT45M"],
    )
    transport_type: TransportType | None = Field(
        description="Тип транспорта трансфера.",
        default=None,
    )
    price: float | None = Field(
        description="Стоимость трансфера.",
        default=None,
        examples=[35.0],
    )
    currency: Currency | None = Field(
        description="Валюта стоимости трансфера.",
        default=None,
    )
    conditions: str | None = Field(
        description="Условия трансфера (встреча, ожидание, правила).",
        default=None,
    )

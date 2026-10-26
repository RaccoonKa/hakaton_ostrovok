"""
Доменная модель перелёта.
"""

from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field

from domain.common import Currency


class Flight(BaseModel):
    """Односторонний перелёт между двумя точками."""

    model_config = ConfigDict(extra="forbid")

    origin: str = Field(
        description="Точка отправления (город или аэропорт).",
        examples=["Moscow"],
    )
    destination: str = Field(
        description="Точка прибытия (город или аэропорт).",
        examples=["Antalya"],
    )
    departure_at: datetime = Field(
        description="Дата и время вылета.",
        examples=["2026-07-01T10:30:00+03:00"],
    )
    arrival_at: datetime = Field(
        description="Дата и время прилёта.",
        examples=["2026-07-01T14:45:00+03:00"],
    )
    duration: timedelta | None = Field(
        description="Длительность перелёта.",
        default=None,
        examples=["PT4H15M"],
    )
    carrier: str | None = Field(
        description="Авиакомпания.",
        default=None,
        examples=["Turkish Airlines"],
    )
    flight_number: str | None = Field(
        description="Номер рейса.",
        default=None,
        examples=["TK3708"],
    )
    stops: int = Field(
        description="Количество пересадок.",
        default=0,
        examples=[0, 1, 2],
    )
    baggage: str | None = Field(
        description="Условия по багажу.",
        default=None,
        examples=["1 место 23 кг"],
    )
    price: float | None = Field(
        description="Стоимость перелёта.",
        default=None,
        examples=[249.99],
    )
    currency: Currency | None = Field(
        description="Валюта стоимости перелёта.",
        default=None,
    )
    refundable: bool | None = Field(
        description="Возвратный ли билет.",
        default=None,
    )
    changeable: bool | None = Field(
        description="Можно ли изменить билет (обмен).",
        default=None,
    )

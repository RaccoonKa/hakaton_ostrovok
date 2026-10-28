"""
Доменная модель перемещения между городами/точками маршрута.
"""

from datetime import datetime, timedelta

from pydantic import BaseModel, ConfigDict, Field

from domain.common import Currency, TransportType


class Transport(BaseModel):
    """Перемещение между городами/точками маршрута (поезд, автобус, автомобиль)."""

    model_config = ConfigDict(extra="forbid")

    origin: str = Field(
        description="Точка отправления.",
        examples=["Moscow"],
    )
    destination: str = Field(
        description="Точка прибытия.",
        examples=["Saint Petersburg"],
    )
    departure_at: datetime = Field(
        description="Дата и время отправления.",
        examples=["2026-07-01T08:00:00+03:00"],
    )
    arrival_at: datetime = Field(
        description="Дата и время прибытия.",
        examples=["2026-07-01T12:00:00+03:00"],
    )
    duration: timedelta | None = Field(
        description="Длительность перемещения.",
        default=None,
        examples=["PT4H"],
    )
    transport_type: TransportType | None = Field(
        description="Тип транспорта.",
        default=None,
    )
    carrier: str | None = Field(
        description="Перевозчик.",
        default=None,
        examples=["RZD"],
    )
    price: float | None = Field(
        description="Стоимость перемещения.",
        default=None,
        examples=[50.0],
    )
    currency: Currency | None = Field(
        description="Валюта стоимости перемещения.",
        default=None,
    )
    conditions: str | None = Field(
        description="Условия поездки (тариф, правила, ограничения).",
        default=None,
    )
    stops: int = Field(
        description="Количество пересадок (0 — прямой, 1 — с пересадкой).",
        default=0,
        examples=[0, 1],
    )
    transit_point: str | None = Field(
        description="Пункт и вокзал пересадки при стыковочном маршруте.",
        default=None,
        examples=["Москва (Казанский ➔ Ленинградский вокзал)"],
    )
    layover_duration: timedelta | None = Field(
        description="Длительность пересадки между поездами.",
        default=None,
        examples=["PT1H50M"],
    )

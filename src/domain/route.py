"""
Доменные модели, связанные с маршрутом.
"""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

# для реализации туров
class RouteStop(BaseModel):
    """Остановка/город в маршруте путешествия."""

    model_config = ConfigDict(extra="forbid")

    city: str = Field(
        description="Название города остановки.",
        examples=["Antalya"],
    )
    country: str | None = Field(
        description="Страна остановки.",
        default=None,
        examples=["Turkey"],
    )
    arrival_date: date | None = Field(
        description="Дата прибытия в город.",
        default=None,
        examples=["2026-07-01"],
    )
    departure_date: date | None = Field(
        description="Дата отъезда из города.",
        default=None,
        examples=["2026-07-08"],
    )
    nights: int | None = Field(
        description="Количество ночей в городе.",
        default=None,
        examples=[7],
    )
    order: int = Field(
        description="Порядковый номер остановки в маршруте.",
        default=0,
        examples=[0, 1, 2],
    )

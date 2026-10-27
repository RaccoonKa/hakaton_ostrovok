"""
Доменная модель маршрута путешествия.
"""

from pydantic import BaseModel, ConfigDict, Field

from domain.flight import Flight
from domain.hotel import Hotel
from domain.route import RouteStop
from domain.transfer import Transfer
from domain.transport import Transport


# для реализации туров
class Itinerary(BaseModel):
    """Последовательность элементов путешествия."""

    model_config = ConfigDict(extra="forbid")

    stops: list[RouteStop] = Field(
        description="Города/остановки маршрута по порядку.",
        default=[],
    )
    flights: list[Flight] = Field(
        description="Перелёты в составе маршрута.",
        default=[],
    )
    hotels: list[Hotel] = Field(
        description="Проживания в составе маршрута.",
        default=[],
    )
    transport: list[Transport] = Field(
        description="Перемещения между городами в составе маршрута.",
        default=[],
    )
    transfers: list[Transfer] = Field(
        description="Трансферы между точками маршрута.",
        default=[],
    )

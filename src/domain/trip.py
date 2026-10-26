"""
Доменные модели варианта поездки и её бюджета.
"""

from pydantic import BaseModel, ConfigDict, Field

from domain.common import Currency
from domain.flight import Flight
from domain.hotel import Hotel
from domain.itinerary import Itinerary
from domain.route import RouteStop
from domain.transfer import Transfer
from domain.transport import Transport


class TripBudget(BaseModel):
    """Стоимость путешествия с разбивкой по категориям."""

    model_config = ConfigDict(extra="forbid")

    flights_total: float | None = Field(
        description="Суммарная стоимость перелётов.",
        default=None,
        examples=[50000],
    )
    hotels_total: float | None = Field(
        description="Суммарная стоимость проживания.",
        default=None,
        examples=[80000],
    )
    transport_total: float | None = Field(
        description="Суммарная стоимость перемещений.",
        default=None,
        examples=[10000],
    )
    transfers_total: float | None = Field(
        description="Суммарная стоимость трансферов.",
        default=None,
        examples=[5000],
    )
    other_total: float | None = Field(
        description="Прочие расходы.",
        default=None,
        examples=[5000],
    )
    total: float | None = Field(
        description="Итоговая стоимость путешествия.",
        default=None,
        examples=[150000],
    )
    currency: Currency | None = Field(
        description="Валюта стоимости.",
        default=None,
    )


class TripOption(BaseModel):
    """Один конкретный кандидат на путешествие.

    На этом этапе описывает только структуру данных, без логики расчёта.
    """

    model_config = ConfigDict(extra="forbid")

    flights: list[Flight] = Field(
        description="Перелёты, входящие в вариант поездки.",
        default=[],
    )
    hotels: list[Hotel] = Field(
        description="Проживания, входящие в вариант поездки.",
        default=[],
    )
    transport: list[Transport] = Field(
        description="Перемещения, входящие в вариант поездки.",
        default=[],
    )
    transfers: list[Transfer] = Field(
        description="Трансферы, входящие в вариант поездки.",
        default=[],
    )
    stops: list[RouteStop] = Field(
        description="Остановки/города маршрута варианта поездки.",
        default=[],
    )
    itinerary: Itinerary | None = Field(
        description="Итоговый маршрут варианта поездки.",
        default=None,
    )
    budget: TripBudget | None = Field(
        description="Разбивка стоимости варианта поездки.",
        default=None,
    )
    total_price: float | None = Field(
        description="Итоговая стоимость варианта поездки.",
        default=None,
        examples=[150000],
    )
    currency: Currency | None = Field(
        description="Валюта итоговой стоимости.",
        default=None,
    )

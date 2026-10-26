"""
Pydantic-модели состояния графа Travel Agent.

Состояние хранит информацию, необходимую агенту для продолжения диалога
и планирования поездки.
"""

from pydantic import BaseModel, ConfigDict, Field

from domain.itinerary import Itinerary
from domain.request import UserRequest
from domain.trip import TripOption


class TravelState(BaseModel):
    """Состояние графа Travel Agent.

    Может быть создано в начале диалога, когда большая часть информации
    о поездке ещё неизвестна.
    """

    model_config = ConfigDict(extra="forbid")

    user_request: UserRequest | None = Field(
        description="Текущие пожелания и ограничения пользователя.",
        default=None,
    )
    candidate_destinations: list[str] = Field(
        description="Рассматриваемые направления.",
        default=[],
        examples=[["Antalya", "Bali"]],
    )
    trip_options: list[TripOption] = Field(
        description="Найденные варианты поездки.",
        default=[],
    )
    selected_option: TripOption | None = Field(
        description="Выбранный пользователем вариант поездки.",
        default=None,
    )
    itinerary: Itinerary | None = Field(
        description="Текущий маршрут путешествия.",
        default=None,
    )
    unresolved_questions: list[str] = Field(
        description="Вопросы, требующие уточнения у пользователя.",
        default=[],
        examples=[["Какие даты поездки предпочтительны?"]],
    )
    messages: list[str] = Field(
        description="История сообщений диалога, если она нужна для используемого графа.",
        default=[],
    )

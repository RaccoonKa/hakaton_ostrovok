from typing import Annotated

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, ConfigDict, Field

from domain.itinerary import Itinerary
from domain.request import UserRequest
from domain.trip import TripOption


class TravelState(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, extra="ignore")

    user_request: UserRequest | None = Field(
        description="Текущие пожелания и ограничения пользователя.",
        default=None,
    )
    candidate_destinations: list[str] = Field(
        description="Рассматриваемые направления.",
        default=[],
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
    )
    messages: Annotated[list[AnyMessage], add_messages] = Field(
        description="История сообщений диалога с поддержкой тулов.",
        default_factory=list,
    )
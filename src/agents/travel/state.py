from typing import Annotated, cast

from langchain_core.messages import AnyMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, ConfigDict, Field

from domain.itinerary import Itinerary
from domain.planning import (
    DateRange,
    DestinationCandidate,
    TravelPlanningStatus,
    ValidationResult,
)
from domain.request import UserRequest


class TravelState(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, extra="ignore")

    user_request: UserRequest | None = Field(
        description="Текущие пожелания и ограничения пользователя (источник истины).",
        default=None,
    )
    planning_status: TravelPlanningStatus = Field(
        description="Текущее состояние процесса планирования.",
        default=cast(TravelPlanningStatus, "collecting"),
    )
    candidate_destinations: list[DestinationCandidate] = Field(
        description="Предложенные агентом направления (ещё не выбранные).",
        default=[],
    )
    date_options: list[DateRange] = Field(
        description="Предложенные агентм конкретные периоды поездки.",
        default=[],
    )
    confirmed_date_range: DateRange | None = Field(
        description="Период, подтверждённый пользователем.",
        default=None,
    )
    destination_confirmed: bool = Field(
        description="Подтвердил ли пользователь выбор города.",
        default=False,
    )
    travelers_provided: bool = Field(
        description="Указал ли пользователь количество путешественников явно.",
        default=False,
    )
    request_confirmed: bool = Field(
        description="Пользователь подтвердил итоговую сверку полного запроса.",
        default=False,
    )
    awaiting_request_confirmation: bool = Field(
        description="Агенту нужно показать итоговую сверку и дождаться подтверждения.",
        default=False,
    )
    last_search_key: str | None = Field(
        description="Нормализованный ключ последнего запуска агрегатора.",
        default=None,
    )
    search_diagnostics: dict = Field(
        description="Диагностика последнего запуска агрегатора (причина, ключ, счётчики).",
        default_factory=dict,
    )
    aggregate_calls: int = Field(
        description="Количество реальных вызовов search_and_package_trip в текущем запросе.",
        default=0,
    )
    pending_questions: list[str] = Field(
        description="Сгруппированные вопросы, ожидающие ответа пользователя.",
        default=[],
    )
    last_validation: ValidationResult | None = Field(
        description="Результат последней deterministic-проверки готовности.",
        default=None,
    )
    trip_options: list[dict] = Field(
        description="Найденные варианты поездки (пакеты из mock aggregator).",
        default=[],
    )
    selected_option: dict | None = Field(
        description="Выбранный пользователем вариант поездки.",
        default=None,
    )
    itinerary: Itinerary | None = Field(
        description="Текущий маршрут путешествия.",
        default=None,
    )
    unresolved_questions: list[str] = Field(
        description="Актуальный набор нерешённых вопросов (не история).",
        default=[],
    )
    messages: Annotated[list[AnyMessage], add_messages] = Field(
        description="История сообщений диалога с поддержкой тулов.",
        default_factory=list,
    )

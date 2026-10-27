"""
Доменные модели, поддерживающие планирование поездки.

Здесь собраны структуры, которые описывают процесс ведения диалога
с пользователем: кандидаты направлений, сгенерированные периоды дат,
результат проверки готовности запроса и патч (diff) для обновления
`UserRequest`.

Модуль намеренно не содержит бизнес-логики — только модели данных.
"""

from datetime import date
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from domain.common import Currency, Month, Season, TransportType
from domain.constraint import Constraint
from domain.preference import Preference


class PriceLevel(StrEnum):
    """Ценовой уровень направления / отеля."""

    BUDGET = "budget"
    MEDIUM = "medium"
    PREMIUM = "premium"


class Destination(BaseModel):
    """Нормализованное направление из mock dataset.

    Описывает замкнутый мир тестовых данных: города, их характеристики
    и аэропорты. Используется для deterministic filtering/ranking.
    """

    model_config = ConfigDict(extra="forbid")

    city: str = Field(description="Официальное название города.", examples=["Rome"])
    country: str = Field(description="Страна города.", examples=["Italy"])
    iata: str = Field(description="IATA-код аэропорта/города.", examples=["FCO"])
    vibes: list[str] = Field(
        description="Характеристики/атмосфера города (beach, history, nature...).",
        default=[],
    )
    suitable_for: list[str] = Field(
        description="Для кого подходит (couples, families, adults...).",
        default=[],
    )
    seasons: list[Season] = Field(
        description="Сезоны, в которые город актуален.",
        default=[],
    )
    price_level: PriceLevel = Field(
        description="Ценовой уровень направления.",
        default=PriceLevel.MEDIUM,
    )


class DestinationCandidate(BaseModel):
    """Предложенный агентом вариант направления (ещё не выбранный пользователем)."""

    model_config = ConfigDict(extra="forbid")

    city: str = Field(description="Город.", examples=["Antalya"])
    country: str = Field(description="Страна.", examples=["Turkey"])
    iata: str | None = Field(description="IATA-код.", default=None)
    reason: str = Field(
        description="Почему этот город подходит под запрос пользователя.",
        default="",
    )


class DateRange(BaseModel):
    """Конкретный период поездки (диапазон дат)."""

    model_config = ConfigDict(extra="forbid")

    start_date: date = Field(description="Дата начала периода.")
    end_date: date = Field(description="Дата окончания периода.")

    @property
    def nights(self) -> int:
        return (self.end_date - self.start_date).days


class ValidationResult(BaseModel):
    """Deterministic-результат проверки готовности запроса к агрегации.

    Это основной защитный барьер перед вызовом агрегатора. Реализуется
    кодом, а не LLM.

    Различаются два рубежа:

    * ``ready_for_confirmation`` — все обязательные данные собраны, можно
      показать итоговую сверку;
    * ``ready_for_search`` — сверка подтверждена пользователем, агрегатор
      разрешён.
    """

    model_config = ConfigDict(extra="forbid")

    ready: bool = Field(
        description="Готов ли запрос к агрегации (== ready_for_search, оставлено для совместимости).",
        default=False,
    )
    ready_for_confirmation: bool = Field(
        description="Все обязательные данные собраны — можно показывать сверку.",
        default=False,
    )
    ready_for_search: bool = Field(
        description="Сверка подтверждена пользователем — можно вызывать агрегатор.",
        default=False,
    )
    stage: str = Field(
        description=(
            "Текущий этап диалога: preferences | destination | dates | details | "
            "confirmation | ready."
        ),
        default="details",
    )
    missing: list[str] = Field(
        description="Обязательные поля, значения которых отсутствуют.",
        default=[],
    )
    missing_fields: list[str] = Field(
        description="Синоним missing для нового API проверки готовности.",
        default=[],
    )
    decisions_required: list[str] = Field(
        description="Решения, которые должен принять пользователь (выбор города/дат).",
        default=[],
    )
    questions: list[str] = Field(
        description="Сгруппированный список вопросов для пользователя.",
        default=[],
    )
    budget_scenarios: list[float] = Field(
        description="Устаревшее поле: бюджетные сценарии больше не генерируются неявно.",
        default=[],
    )
    budget_mode: str = Field(
        description="Актуальный режим бюджета: unknown | specified | no_limit | flexible_scenarios.",
        default="unknown",
    )
    preference_status: str = Field(
        description="Статус предпочтений: unknown | specified | no_preference.",
        default="unknown",
    )
    reason: str = Field(
        description="Человекочитаемое пояснение результата проверки.",
        default="",
    )


# Явные состояния процесса планирования.
TravelPlanningStatus = Literal[
    "collecting",
    "awaiting_preferences",
    "awaiting_destination_selection",
    "awaiting_date_selection",
    "awaiting_request_confirmation",
    "ready_for_search",
    "searching",
    "results_ready",
]


class UserRequestPatch(BaseModel):
    """Патч (diff) для обновления ``UserRequest``.

    Содержит только те значения, которые были найдены или изменены
    в текущем сообщении пользователя. ``None`` означает
    «в текущем сообщении значение не найдено», а НЕ «стереть старое
    значение». Для удаления поля используется отдельная семантика
    (см. ``clear_fields``).
    """

    model_config = ConfigDict(extra="forbid")

    origin: str | None = None
    destination: str | None = None
    destination_country: str | None = None
    destination_ambiguous: bool | None = None
    duration: int | None = None
    travelers: int | None = None
    traveler_range: tuple[int, int] | None = None
    adults: int | None = None
    children: int | None = None
    budget: float | None = None
    budget_range: tuple[float, float] | None = None
    budget_mode: Literal["unknown", "specified", "no_limit", "flexible_scenarios"] | None = None
    currency: Currency | None = None
    exact_dates: list[date] | None = None
    month: list[Month] | None = None
    season: list[Season] | None = None
    preferences: list[Preference] | None = None
    preference_status: Literal["unknown", "specified", "no_preference"] | None = None
    constraints: list[Constraint] | None = None
    preferred_transport: TransportType | None = None
    hotel_requirements: list[str] | None = None
    # Явная замена/отмена ранее заданных значений.
    removed_preferences: list[str] | None = None
    removed_constraints: list[str] | None = None
    removed_hotel_requirements: list[str] | None = None
    # Семантическое удаление значений.
    clear_fields: list[str] = Field(
        default_factory=list,
        description="Список полей, которые нужно сбросить в значение по умолчанию.",
    )

    def is_empty(self) -> bool:
        """True, если патч не вносит никаких изменений."""
        return self.model_dump(exclude_none=True, exclude_defaults=True) == {}


class SelectionResult(BaseModel):
    """Результат разрешения пользовательского выбора среди кандидатов."""

    model_config = ConfigDict(extra="forbid")

    kind: Literal["destination", "date", "unknown"] = "unknown"
    index: int | None = None
    city: str | None = None
    date_range: DateRange | None = None
    raw: str = ""


__all__ = [
    "DateRange",
    "Destination",
    "DestinationCandidate",
    "PriceLevel",
    "SelectionResult",
    "TravelPlanningStatus",
    "UserRequestPatch",
    "ValidationResult",
]

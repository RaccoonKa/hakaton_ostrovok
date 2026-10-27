"""
Доменная модель проживания в отеле.
"""

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from domain.common import Currency, MealPlan


class Hotel(BaseModel):
    """Проживание в отеле."""

    model_config = ConfigDict(extra="forbid")

    hotel: str = Field(
        description="Название отеля.",
        examples=["Rixos Downtown"],
    )
    city: str = Field(
        description="Город, в котором находится отель.",
        examples=["Antalya"],
    )
    check_in: date = Field(
        description="Дата заезда.",
        examples=["2026-07-01"],
    )
    check_out: date = Field(
        description="Дата выезда.",
        examples=["2026-07-08"],
    )
    guests: int = Field(
        description="Количество гостей.",
        default=1,
        examples=[2],
    )
    room_type: str | None = Field(
        description="Тип номера.",
        default=None,
        examples=["Standard Double"],
    )
    district: str | None = Field(
        default=None,
        description="Курортный район (Сириус, Красная Поляна и т.д.).",
    )
    rating: float | None = Field(
        default=None,
        description="Рейтинг гостей по отзывам (например, 4.8).",
    )
    image_url: str | None = Field(
        default=None,
        description="Ссылка на фото отеля.",
    )
    pet_friendly: bool = Field(
        default=False,
        description="Разрешено ли проживание с домашними животными.",
    )
    pet_fee_per_night: float = Field(
        default=0.0,
        description="Доплата за питомца за сутки.",
    )
    check_in_time: str = Field(
        default="14:00",
        description="Время заезда в отель (ЧЧ:ММ).",
    )
    check_out_time: str = Field(
        default="12:00",
        description="Время выезда из отеля (ЧЧ:ММ).",
    )
    early_check_in_fee: float = Field(
        default=0.0,
        description="Стоимость гарантированного раннего заезда.",
    )
    free_cancellation: bool = Field(
        default=True,
        description="Доступна ли бесплатная отмена бронирования.",
    )
    non_refundable_discount_pct: int = Field(
        default=0,
        description="Скидка за невозвратный тариф (в процентах).",
    )
    meal_plan: MealPlan | None = Field(
        description="Тип питания, включённый в проживание.",
        default=MealPlan.BREAKFAST,
    )
    price: float | None = Field(
        description="Стоимость проживания.",
        default=None,
        examples=[1200.0],
    )
    currency: Currency | None = Field(
        description="Валюта стоимости проживания.",
        default=None,
    )
    refundable: bool | None = Field(
        description="Возвратное ли бронирование.",
        default=None,
    )
    cancellation_conditions: str | None = Field(
        description="Условия отмены бронирования.",
        default=None,
        examples=["Бесплатная отмена за 48 часов"],
    )
    amenities: list[str] = Field(
        description="Доступные удобства отеля.",
        default=[],
        examples=[["Wi-Fi", "Pool", "Spa"]],
    )

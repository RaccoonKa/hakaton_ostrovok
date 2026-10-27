"""
Узел тревел-консьержа (Travel Concierge).

Генерирует индивидуальный маршрут по запросу и отвечает на любые вопросы
пользователя по забронированному туру с помощью модели GigaChat.
Учитывает как собак, так и кошек (и поездки без питомцев).
"""

from __future__ import annotations

import logging
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from agents.travel.nodes.ask import _city_name
from agents.travel.state import TravelState
from core.llm import get_model
from core.settings import settings
from schema.models import GigaChatModelName

logger = logging.getLogger(__name__)


def _get_chat_model():
    """Получение модели GigaChat через штатную фабрику core.llm."""
    if hasattr(settings, "DEFAULT_MODEL") and settings.DEFAULT_MODEL in GigaChatModelName:
        try:
            return get_model(settings.DEFAULT_MODEL)
        except Exception as e:
            logger.warning("Не удалось загрузить DEFAULT_MODEL: %s", e)

    for model_name in GigaChatModelName:
        try:
            return get_model(model_name)
        except Exception:
            continue

    raise RuntimeError("Не удалось инициализировать GigaChat. Проверьте GIGACHAT_CREDENTIALS в .env")


def _detect_pet_info(messages: list, request) -> dict:
    """Определяет наличие и точный вид питомца из переписки и запроса."""
    text_corpus = ""
    for m in messages:
        if isinstance(m, HumanMessage):
            text_corpus += " " + str(m.content).lower()

    has_cat = any(w in text_corpus for w in ["кот", "кошк", "котик", "котейк", "котен", "котён"])
    has_dog = any(w in text_corpus for w in ["собак", "щенок", "щенк", "песик", "пёсик", "пёс", "пес"])
    has_generic = any(w in text_corpus for w in ["питомц", "животн", "pet"]) or (
        request and "pet_friendly" in getattr(request, "hotel_requirements", [])
    )

    if has_cat and has_dog:
        return {"has_pet": True, "type": "both", "label": "собакой и кошкой"}
    if has_cat:
        return {"has_pet": True, "type": "cat", "label": "котом / кошкой"}
    if has_dog:
        return {"has_pet": True, "type": "dog", "label": "собакой"}
    if has_generic:
        return {"has_pet": True, "type": "pet", "label": "домашним питомцем"}
    return {"has_pet": False, "type": None, "label": ""}


ITINERARY_SYSTEM_PROMPT = """Ты — профессиональный тревел-консьерж и местный гид.
Твоя задача — составить логичный, реалистичный и красивый план отдыха по дням.

Строгие правила:
1. Опирайся на реальную географию города и отеля. Не перемещай туристов через весь регион в один день.
2. Реалистичность для питомцев:
   - Если туристы с СОБАКОЙ: советуй парки, набережные, эко-тропы и видовые террасы ресторанов. Не выдумывай купание животных в фонтанах или бассейнах.
   - Если туристы с КОТОМ/КОШКОЙ: кот остаётся в номере отеля. Не нужно писать «прогулка с кошкой по горам/паркам» — программа строится для отдыха хозяев (СПА, пляж, рестораны, достопримечательности), а для кота упоминается уютный номер отеля.
   - Если без животных: классическая сбалансированная программа.
3. Формат строго:
**День N: Краткое название**
2-3 связных, информативных предложения с конкретными локациями.
4. СТРОЖАЙШИЙ ЗАПРЕТ:
- Никаких вступительных слов («Конечно, вот ваш план»). Начинай сразу с «**День 1: ...**».
- Никаких итоговых выводов и шаблонных заключений в конце («Каждый день продуман...»). Текст должен оканчиваться описанием последнего дня."""


def generate_itinerary(city: str, nights: int, hotel_name: str, pet_info: dict) -> str:
    """Генерация гибкого маршрута через GigaChat."""
    days = max(1, nights)
    if pet_info["has_pet"]:
        if pet_info["type"] == "cat":
            pet_context = "Туристы берут с собой кота/кошку (отель pet-friendly, кот остаётся в номере, программа для хозяев без выгула кота на улице)."
        else:
            pet_context = f"Туристы путешествуют с {pet_info['label']} (нужны дог-френдли парки, набережные и открытые террасы)."
    else:
        pet_context = "Поездка без домашних животных."

    prompt = (
        f"Город: {city}\n"
        f"Отель проживания: {hotel_name}\n"
        f"Дней: {days}\n"
        f"Особенности: {pet_context}\n\n"
        f"Составь программу на {days} дней. Без вступлений и заключений."
    )

    try:
        model = _get_chat_model()
        response = model.invoke([
            SystemMessage(content=ITINERARY_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])
        return str(response.content).strip()
    except Exception as e:
        logger.error("Ошибка при генерации маршрута в GigaChat: %s", e)
        return "\n\n".join(
            f"**День {i}: Отдых и знакомство с городом {city}**\n"
            f"Прогулки по набережным, посещение видовых мест и релакс в отеле {hotel_name}."
            for i in range(1, days + 1)
        )


CONCIERGE_SYSTEM_PROMPT = """Ты — заботливый консьерж туристического агентства.
Клиент уже забронировал тур и общается с тобой в чате.

Твоя задача — отвечать дружелюбно, ёмко, по существу и профессионально.
- Документы для Турции (Стамбул, Анталья): гражданам РФ обязателен загранпаспорт со сроком действия не менее 120 дней со дня въезда. Безвизовый въезд разрешён на срок до 60 дней.
- Документы по России (Сочи, Калининград, СПб): достаточно внутреннего паспорта РФ.
- Нормы провоза питомцев (собаки и кошки):
  * На рейсах Аэрофлот/S7/Turkish Airlines животное летит в салоне в сумке-переноске (габариты до 126 см по сумме трёх измерений, вес с переноской до 8 кг).
  * Для международных рейсов в Турцию на животное дополнительно потребуется международный ветеринарный сертификат (форма 5а) и чипирование.
- Нормы багажа: 1 место до 23 кг на человека + 10 кг ручная кладь.
- Трансфер: встреча в зоне прилёта с именной табличкой.

Отвечай в Markdown, без шаблонных рассуждений и лишней воды."""


def call_concierge(state: TravelState | dict) -> dict:
    """Обработка обращений к консьержу: выдача маршрута по запросу или консультация."""
    messages = state.get("messages", []) if isinstance(state, dict) else getattr(state, "messages", [])
    selected = state.get("selected_option") if isinstance(state, dict) else getattr(state, "selected_option", None)
    request = state.get("user_request") if isinstance(state, dict) else getattr(state, "user_request", None)

    last_text = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_text = str(m.content).strip()
            break

    lowered = last_text.lower()

    # 1. Запрос на отмену / смену тура
    reset_words = ["другой вариант", "другой тур", "поменяй тур", "выбрать другой", "начать заново", "сброс", "назад"]
    if any(w in lowered for w in reset_words):
        return {
            "selected_option": None,
            "planning_status": "results_ready",
            "messages": [
                AIMessage(
                    content="Хорошо, я сбросил текущий выбор тура. Напишите номер или название варианта, который хотите выбрать взамен."
                )
            ]
        }

    hotel_name = selected.get("hotel", {}).get("name", "Отель")
    dest = _city_name(getattr(request, "destination", "")) or "Сочи"
    nights = selected.get("nights", 5)

    pet_info = _detect_pet_info(messages, request)

    # 2. Если пользователь просит составить маршрут / план
    itinerary_triggers = ["план", "маршрут", "программ", "составь", "расписан", "куда сходить", "давай маршрут", "да, составь", "составить"]
    if any(w in lowered for w in itinerary_triggers) or lowered in {"да", "давай", "хочу", "согласен", "хочу план"}:
        itinerary = generate_itinerary(dest, nights, hotel_name, pet_info)
        reply = (
            f"🗺️ **Ваша индивидуальная программа на {nights} дней в {dest}:**\n\n"
            f"{itinerary}\n\n"
            f"───────────────────────────────\n"
            f"Маршрут гибкий — любой день можно изменить по вашему желанию! Также я могу ответить на любые вопросы по багажу, питомцу или трансферу."
        )
        return {"messages": [AIMessage(content=reply)]}

    # 3. Все остальные вопросы отправляем в GigaChat с контекстом тура
    hotel_info = selected.get("hotel", {})
    transport_info = selected.get("transport", {})
    transfer_info = selected.get("transfer", {})

    pet_description = f"Едут с {pet_info['label']} (доплата в отель включена)" if pet_info["has_pet"] else "Без животных"

    is_turkey = dest in {"Стамбул", "Анталья", "Istanbul", "Antalya"}
    doc_rule = "Загранпаспорт РФ со сроком действия от 120 дней (виза не требуется)" if is_turkey else "Внутренний паспорт РФ"

    context = (
        f"Город: {dest}\n"
        f"Даты: с {selected.get('departure_date')} по {selected.get('return_date')} ({nights} ноч.)\n"
        f"Отель: {hotel_info.get('name')} ({hotel_info.get('stars')}★)\n"
        f"Перелёт: {transport_info.get('type')} {transport_info.get('carrier')} (рейс {transport_info.get('id')})\n"
        f"Трансфер: {transfer_info.get('vehicle', 'Комфорт')}\n"
        f"Пассажиров: {selected.get('passengers', 2)}\n"
        f"Итоговая стоимость: {selected.get('grand_total', 0):,.0f} ₽\n"
        f"Документы для поездки: {doc_rule}\n"
        f"Особенности: {pet_description}, включен багаж, бесплатная отмена.\n"
    )

    try:
        model = _get_chat_model()
        prompt = (
            f"Контекст забронированного тура клиента:\n{context}\n\n"
            f"Вопрос туриста: {last_text}"
        )
        response = model.invoke([
            SystemMessage(content=CONCIERGE_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])
        return {"messages": [AIMessage(content=str(response.content).strip())]}
    except Exception as e:
        logger.error("Ошибка при ответе консьержа в GigaChat: %s", e)
        return {
            "messages": [
                AIMessage(
                    content="Я на связи! По вашей поездке подтверждён отель, перелёт с багажом и трансфер. На какой вопрос ответить подробнее?"
                )
            ]
        }


__all__ = ["call_concierge", "generate_itinerary"]
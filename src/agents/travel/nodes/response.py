"""
Узел формирования итогового ответа.
"""

from __future__ import annotations

from langchain_core.messages import AIMessage

from agents.travel.nodes.ask import _city_name
from agents.travel.state import TravelState


def _format_package(pkg: dict) -> str:
    pkg_type = pkg.get("package_type", "Вариант")
    total = pkg.get("grand_total", 0)
    desc = pkg.get("description", "")
    within = pkg.get("is_within_budget", True)
    mode = pkg.get("budget_mode")

    status_badge = ""
    if mode != "no_limit":
        status_badge = " — ✅ в бюджете" if within else " — ⚠️ превышает бюджет"

    lines = [
        f"🌟 **{pkg_type}**{status_badge}",
        f"{desc}",
        f"💳 Общая стоимость: **{total:,.0f} ₽**".replace(",", " "),
    ]
    if not within and pkg.get("over_budget_amount"):
        over = pkg["over_budget_amount"]
        lines.append(f"Превышение: {over:,.0f} ₽".replace(",", " "))
    return "\n\n".join(lines)


def generate_response(state: TravelState | dict) -> dict:
    if isinstance(state, dict):
        trip_options = state.get("trip_options", []) or []
        selected = state.get("selected_option")
        request = state.get("user_request")
    else:
        trip_options = getattr(state, "trip_options", []) or []
        selected = getattr(state, "selected_option", None)
        request = getattr(state, "user_request", None)

    # 1. Если вариант выбран — фиксируем бронь и даём интерактивный выбор
    if selected:
        pkg_type = selected.get("package_type", "Выбранный вариант")
        total = selected.get("grand_total", 0)
        desc = selected.get("description", "")
        dest = _city_name(getattr(request, "destination", None)) if request else "Сочи"
        nights = selected.get("nights", 5)

        text = (
            f"🎉 **Отличный выбор! Вы забронировали вариант «{pkg_type}» в {dest}.**\n\n"
            f"{desc}\n\n"
            f"💳 Итоговая стоимость: **{total:,.0f} ₽**\n"
            f"───────────────────────────────\n\n"
            f"🛎️ **Персональный консьерж активирован!**\n"
            f"Я на связи на протяжении всей поездки. Чем вам помочь?\n\n"
            f"• 🗺️ **Составить персональный маршрут на {nights} дней** (достопримечательности, видовые места и дог-френдли локации)?\n"
            f"• 🐶 **Правила перелёта с собакой** и подготовка документов к вылету?\n"
            f"• 🧳 **Нормы багажа** и ручной клади на ваших рейсах?\n"
            f"• 🚖 **Детали трансфера** и встреча в аэропорту?\n\n"
            f"Напишите любой вопрос или отправьте «**Составь маршрут**»!"
        )
        return {"messages": [AIMessage(content=text)]}

    # 2. Если вариантов нет
    if not trip_options:
        return {
            "messages": [
                AIMessage(
                    content="Не удалось подобрать варианты. Попробуйте изменить параметры поиска."
                )
            ]
        }

    # 3. Первичный показ списка вариантов
    dest = getattr(request, "destination", None) if request else None
    lines = []
    if dest:
        lines.append(f"Я подобрал для вас варианты поездки в {_city_name(dest)}:\n")
    else:
        lines.append("Я подобрал для вас варианты поездки:\n")

    for pkg in trip_options:
        lines.append(_format_package(pkg))

    lines.append("Какой из вариантов вам больше подходит?")
    final_text = "\n\n".join(lines)

    return {"messages": [AIMessage(content=final_text)]}


__all__ = ["generate_response"]
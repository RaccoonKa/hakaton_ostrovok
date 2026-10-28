"""
Узел формирования итогового ответа с расширенной реакцией на бюджет
и прозрачной детализацией стоимости (билеты + отель + трансфер).
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

    transport = pkg.get("transport") or {}
    hotel = pkg.get("hotel") or {}
    transfer = pkg.get("transfer") or {}

    t_price = transport.get("price_total", 0)
    t_type = "🚆 Поезд" if transport.get("type") == "Поезд" else "✈️ Перелёт"
    t_carrier = transport.get("carrier", "")
    h_price = hotel.get("price_total", 0)
    h_nights = hotel.get("nights", pkg.get("nights", 0))
    h_name = hotel.get("name", "Отель")
    tr_price = transfer.get("price_total", 0)

    # Детализация, что входит в стоимость
    breakdown_lines = []
    if t_price:
        carrier_str = f" ({t_carrier})" if t_carrier else ""
        breakdown_lines.append(f"  • {t_type}{carrier_str}: **{t_price:,.0f} ₽**")
    if h_price:
        breakdown_lines.append(f"  • 🏨 Проживание ({h_name}, {h_nights} ноч.): **{h_price:,.0f} ₽**")
    if tr_price:
        tr_veh = transfer.get("vehicle", "Комфорт")
        breakdown_lines.append(f"  • 🚖 Трансфер ({tr_veh}): **{tr_price:,.0f} ₽**")

    status_badge = ""
    if mode != "no_limit":
        status_badge = " — ✅ в бюджете" if within else " — ⚠️ превышает бюджет"

    breakdown_block = "\n".join(breakdown_lines)

    lines = [
        f"🌟 **{pkg_type}**{status_badge}",
        f"{desc}",
        f"📋 **В стоимость входит:**\n{breakdown_block}",
        f"💳 **Итого к оплате:** **{total:,.0f} ₽**".replace(",", " "),
    ]
    if not within and pkg.get("over_budget_amount"):
        over = pkg["over_budget_amount"]
        lines.append(f"⚠️ Превышение бюджета: **+{over:,.0f} ₽**".replace(",", " "))
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

    # 1. Если вариант уже забронирован — активируем меню консьержа
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
            f"• 🐶 **Правила перелёта с питомцем** и подготовка документов к вылету?\n"
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
                    content="Не удалось подобрать варианты под ваши фильтры. Попробуйте скорректировать требования (например, снять ограничение по пересадкам или звёздности отеля)."
                )
            ]
        }

    # 3. Анализ бюджета и формирование ответа
    dest = getattr(request, "destination", None) if request else None
    dest_name = _city_name(dest) if dest else ""

    budget_limit = getattr(request, "budget", None)
    if not budget_limit and getattr(request, "budget_range", None):
        budget_limit = request.budget_range[1]

    budget_mode = getattr(request, "budget_mode", "specified")
    all_over = all(not pkg.get("is_within_budget", True) for pkg in trip_options) if budget_mode != "no_limit" else False
    any_over = any(not pkg.get("is_within_budget", True) for pkg in trip_options) if budget_mode != "no_limit" else False

    is_absurd_budget = budget_limit is not None and budget_limit < 5000 and budget_mode != "no_limit"

    lines: list[str] = []

    if is_absurd_budget and trip_options:
        min_price = min(pkg.get("grand_total", 0) for pkg in trip_options)
        lines.append(
            f"⚠️ **Обратите внимание по бюджету:**\n"
            f"Заявленная сумма **{budget_limit:,.0f} ₽** символическая и не покрывает даже минимальную стоимость билетов. "
            f"Реальная стоимость готового тура в {dest_name} (билеты, отель и трансфер) "
            f"начинается от **{min_price:,.0f} ₽**.\n\n"
            f"Вот лучшие найденные варианты:\n".replace(",", " ")
        )
    elif all_over and budget_limit:
        min_over = min(pkg.get("over_budget_amount", 0) for pkg in trip_options)
        lines.append(
            f"⚠️ **Обратите внимание по бюджету:**\n"
            f"К сожалению, полностью уложиться в заявленные **{budget_limit:,.0f} ₽** не получилось — "
            f"из-за прямых рейсов и выбранных отелей даже наиболее доступный вариант выходит дороже "
            f"(минимальная доплата от **+{min_over:,.0f} ₽**).\n\n"
            f"Вот лучшие найденные варианты в {dest_name} с минимальным превышением:\n".replace(",", " ")
        )
    elif any_over and budget_limit:
        lines.append(
            f"Я подобрал для вас варианты поездки в {dest_name}. "
            f"Базовый тариф полностью вписывается в бюджет, а более высокие категории потребуют небольшой доплаты:\n"
        )
    else:
        if dest_name:
            lines.append(f"Я подобрал для вас отличные варианты поездки в {dest_name}:\n")
        else:
            lines.append("Я подобрал для вас варианты поездки:\n")

    for pkg in trip_options:
        lines.append(_format_package(pkg))

    if is_absurd_budget:
        lines.append(
            "💡 Чтобы мы подобрали варианты строго в рамках ваших возможностей, укажите реальный бюджет (например, 100 000 ₽) или напишите «без ограничений»."
        )
    elif all_over and budget_limit:
        lines.append(
            "💡 **Как можно снизить стоимость, чтобы уложиться в бюджет:**\n"
            "• Сократить поездку на 1–2 ночи;\n"
            "• Рассмотреть отель 3★ вместо 4★;\n"
            "• Разрешить рейсы с пересадкой (они часто на 20-30% дешевле).\n\n"
            "Какой из вариантов выберем или скорректируем параметры?"
        )
    else:
        lines.append("Какой из вариантов вам больше подходит?")

    final_text = "\n\n".join(lines)
    return {"messages": [AIMessage(content=final_text)]}


__all__ = ["generate_response"]
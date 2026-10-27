"""
Узел формирования итогового ответа.

Полностью deterministic: не зависит от LLM и использует только
``trip_options`` из mock aggregator. Формирует сообщение для сценария
«результаты поиска». Сценарии «уточнение», «выбор города», «выбор дат»
обрабатываются узлом ``ask`` через interrupt.
"""

from __future__ import annotations

from langchain_core.messages import AIMessage

from agents.travel.state import TravelState


def _format_package(pkg: dict) -> str:
    pkg_type = pkg.get("package_type", "Вариант")
    total = pkg.get("grand_total", 0)
    desc = pkg.get("description", "")
    scenario = pkg.get("budget_scenario")
    within = pkg.get("is_within_budget", True)

    header = f"**{pkg_type}**"
    if scenario:
        header += f" ({scenario})"
    status = "✅ в бюджете" if within else "⚠️ превышает бюджет"
    lines = [
        f"{header} — {status}",
        desc,
        f"Общая стоимость: **{total:,.0f} ₽**".replace(",", " "),
    ]
    if not within and pkg.get("over_budget_amount"):
        over = pkg["over_budget_amount"]
        lines.append(f"Превышение: {over:,.0f} ₽".replace(",", " "))
    return "\n".join(lines)


def generate_response(state: TravelState | dict) -> dict:
    if isinstance(state, dict):
        trip_options = state.get("trip_options", []) or []
        request = state.get("user_request")
    else:
        trip_options = getattr(state, "trip_options", []) or []
        request = getattr(state, "user_request", None)

    if not trip_options:
        return {
            "messages": [
                AIMessage(
                    content="Не удалось подобрать варианты. Попробуйте изменить параметры поиска."
                )
            ]
        }

    dest = getattr(request, "destination", None) if request else None
    lines = []
    if dest:
        lines.append(f"Я подобрал для вас варианты поездки в {dest}:\n")
    else:
        lines.append("Я подобрал для вас варианты поездки:\n")

    for pkg in trip_options:
        lines.append(_format_package(pkg))

    lines.append("Какой из вариантов вам больше подходит?")
    final_text = "\n\n".join(lines)

    return {"messages": [AIMessage(content=final_text)]}


__all__ = ["generate_response"]

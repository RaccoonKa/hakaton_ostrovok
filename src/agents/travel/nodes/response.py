import json
from langchain_core.messages import AIMessage, ToolMessage
from agents.travel.state import TravelState


def generate_response(state: TravelState | dict):
    if isinstance(state, dict):
        messages = state.get("messages", [])
    else:
        messages = getattr(state, "messages", [])

    packages_data = []
    for msg in reversed(messages):
        if isinstance(msg, ToolMessage):
            try:
                packages_data = json.loads(msg.content)
                break
            except Exception:
                pass

    if not packages_data:
        for msg in reversed(messages):
            if isinstance(msg, AIMessage) and msg.content:
                return {"messages": [msg]}
        return {"messages": [AIMessage(content="Не удалось подобрать варианты. Попробуйте изменить параметры поиска.")]}

    text_lines = ["Я подобрал для вас варианты поездки:\n"]
    for p in packages_data:
        pkg_type = p.get("package_type", "Вариант")
        desc = p.get("description", "")
        total = p.get("grand_total", 0)
        within = p.get("is_within_budget", True)

        status_mark = "✅" if within else "⚠️ (превышает бюджет)"
        text_lines.append(f"**{pkg_type}** {status_mark}\n{desc}\nОбщая стоимость: **{total:,.0f} руб.**\n".replace(",", " "))

    text_lines.append("Какой из вариантов вам больше подходит, или скорректируем даты/бюджет?")
    final_text = "\n".join(text_lines)

    return {
        "messages": [AIMessage(content=final_text)],
        "trip_options": packages_data,
    }
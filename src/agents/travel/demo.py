"""
Интерактивный demo-режим travel-agent на mock dataset.

Позволяет вручную вести диалог с агентом без внешних API::

    PYTHONPATH=src python -m agents.travel.demo

Сценарий используется и в ручных, и в автоматических проверках:
агент предлагает города → пользователь выбирает → агент уточняет
недостающие данные → пользователь отвечает сразу на несколько вопросов
→ агент вызывает mock aggregator → показывает варианты.

Данные берутся исключительно из ``tools.mock_dataset`` — агент не
выдумывает города/отели/рейсы/цены.
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from agents.travel.graph import build_travel_graph


def _interrupt_value(result: dict) -> str:
    intr = result.get("__interrupt__")
    if not intr:
        return ""
    first = intr[0] if isinstance(intr, (list, tuple)) else intr
    return str(getattr(first, "value", first))


def _print_trip_options(options: list[dict]) -> None:
    print("\n=== Варианты поездки ===")
    for pkg in options:
        scenario = f" ({pkg['budget_scenario']})" if pkg.get("budget_scenario") else ""
        within = "✅ в бюджете" if pkg.get("is_within_budget", True) else "⚠️ превышает бюджет"
        print(
            f"• {pkg['package_type']}{scenario} — {within}, "
            f"{pkg['grand_total']:,.0f} ₽".replace(",", " ")
        )
        print(f"  {pkg.get('description', '')}")


def run_demo() -> None:
    """Запустить интерактивный диалог в терминале."""
    graph = build_travel_graph(checkpointer=InMemorySaver())
    thread_id = "demo-thread"
    config = {"configurable": {"thread_id": thread_id}}

    print("Travel Agent (mock/demo). Введите 'exit' для выхода.")
    print("Пример: 'Хочу куда-нибудь на море в июле на неделю.'\n")

    awaiting = False
    while True:
        try:
            text = input("Вы: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if text.lower() in {"exit", "quit", "выход"}:
            break
        if not text:
            continue

        if awaiting:
            result = graph.invoke(Command(resume=text), config)
        else:
            result = graph.invoke({"messages": [HumanMessage(content=text)]}, config)

        interrupt_text = _interrupt_value(result)
        if interrupt_text:
            awaiting = True
            print(f"\nАгент:\n{interrupt_text}\n")
        else:
            awaiting = False
            options = result.get("trip_options", []) or []
            if options:
                _print_trip_options(options)
                print()
            else:
                print("\nАгент: не удалось подобрать варианты.\n")


if __name__ == "__main__":
    run_demo()
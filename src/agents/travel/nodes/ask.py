"""
Узел Human-in-the-loop.

Формирует **одно** сообщение со всеми необходимыми уточнениями и вызывает
LangGraph ``interrupt``. Interrupt используется не для каждого поля
отдельно, а для всего сгруппированного набора вопросов / вариантов выбора.

После ответа пользователя поток продолжается через тот же thread, и ответ
снова проходит через узел извлечения.
"""

from __future__ import annotations

from langchain_core.messages import HumanMessage
from langgraph.types import interrupt

from agents.travel.state import TravelState
from domain.planning import DateRange, DestinationCandidate


def _format_destination_prompt(candidates: list[DestinationCandidate]) -> str:
    lines = ["Уточните, пожалуйста, город поездки — вот подходящие варианты:"]
    for i, cand in enumerate(candidates, start=1):
        reason = f" — {cand.reason}" if cand.reason else ""
        lines.append(f"{i}. {cand.city} ({cand.country}){reason}")
    lines.append("\nНапишите номер или название выбранного города.")
    return "\n".join(lines)


def _format_date_prompt(date_options: list[DateRange]) -> str:
    lines = ["Уточните, пожалуйста, период поездки — вот подходящие варианты:"]
    for i, rng in enumerate(date_options, start=1):
        lines.append(
            f"{i}. {rng.start_date.isoformat()} — {rng.end_date.isoformat()} ({rng.nights} ноч.)"
        )
    lines.append("\nНапишите номер или свои даты.")
    return "\n".join(lines)


def _format_questions_prompt(questions: list[str]) -> str:
    lines = ["Подскажите, пожалуйста:"]
    for i, q in enumerate(questions, start=1):
        lines.append(f"{i}. {q}")
    return "\n".join(lines)


def call_ask(state: TravelState | dict) -> dict:
    if isinstance(state, dict):
        status = state.get("planning_status", "collecting")
        candidates = list(state.get("candidate_destinations", []) or [])
        date_options = list(state.get("date_options", []) or [])
        questions = list(state.get("unresolved_questions", []) or [])
    else:
        status = getattr(state, "planning_status", "collecting")
        candidates = list(getattr(state, "candidate_destinations", []) or [])
        date_options = list(getattr(state, "date_options", []) or [])
        questions = list(getattr(state, "unresolved_questions", []) or [])

    # Вопросы, которые уже закрываются самим выбором варианта, не дублируем.
    redundant_markers = ["предложенных", "В какой город или страну"]
    extra = [q for q in questions if not any(m in q for m in redundant_markers)]

    if status == "awaiting_destination_selection" and candidates:
        prompt = _format_destination_prompt(candidates)
        if extra:
            prompt += "\n\n" + _format_questions_prompt(extra)
    elif status == "awaiting_date_selection" and date_options:
        prompt = _format_date_prompt(date_options)
        if extra:
            prompt += "\n\n" + _format_questions_prompt(extra)
    elif questions:
        prompt = _format_questions_prompt(questions)
    else:
        prompt = "Уточните, пожалуйста, детали поездки."

    # Единственный interrupt на весь сгруппированный набор.
    # LangGraph возвращает ответ пользователя как значение interrupt().
    response = interrupt(prompt)

    # Обязательно добавляем ответ пользователя в messages, чтобы узел
    # extraction обработал его на следующей итерации того же thread.
    return {"messages": [HumanMessage(content=str(response))]}


__all__ = ["call_ask"]

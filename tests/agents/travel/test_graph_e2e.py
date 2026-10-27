"""
End-to-end тесты графа travel-agent.

Используют in-memory checkpointer и реальный граф (без LLM): логика
полностью deterministic. Покрывают этапы диалога, персистентность между
сообщениями, сгруппированные вопросы, выбор города/периода, режимы бюджета,
итоговую сверку и инвалидацию результатов.
"""

from __future__ import annotations

import pytest
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from agents.travel.graph import build_travel_graph
from agents.travel.tools import mock_dataset as ds
from domain.common import Month


@pytest.fixture
def graph():
    return build_travel_graph(checkpointer=InMemorySaver())


def _start(graph, thread_id: str, message: str):
    config = {"configurable": {"thread_id": thread_id}}
    result = graph.invoke({"messages": [HumanMessage(content=message)]}, config)
    return result, result.get("__interrupt__")


def _resume(graph, thread_id: str, message: str):
    config = {"configurable": {"thread_id": thread_id}}
    result = graph.invoke(Command(resume=message), config)
    return result, result.get("__interrupt__")


def _text(interrupt) -> str:
    if not interrupt:
        return ""
    first = interrupt[0] if isinstance(interrupt, (list, tuple)) else interrupt
    return str(getattr(first, "value", first))


def _first_turn(graph, thread_id: str = "t"):
    result, interrupt = _start(graph, thread_id, "Хочу куда-то полететь")
    assert interrupt
    return result, _text(interrupt)


# --------------------------------------------------------------------------
# A. Первый ход и предпочтения
# --------------------------------------------------------------------------
def test_first_turn_asks_only_vibe(graph):
    result, text = _first_turn(graph, "a1")
    lowered = text.lower()
    assert "какой отдых" in lowered
    assert "даты" not in lowered
    assert "бюджет" not in lowered
    assert "сколько человек" not in lowered
    assert result["candidate_destinations"] == []
    assert result["planning_status"] == "awaiting_preferences"


def test_first_turn_preserves_params_and_does_not_reask(graph):
    result, interrupt = _start(
        graph, "a2", "Хочу куда-то полететь, в августе на неделю, нас двое"
    )
    text = _text(interrupt).lower()
    req = result["user_request"]
    assert result["planning_status"] == "awaiting_preferences"
    assert req.date_preferences.month == [Month.AUGUST]
    assert req.duration == 7
    assert req.travelers == 2
    assert req.travelers_provided is True
    assert "какой отдых" in text and "даты" not in text

    result2, interrupt2 = _resume(graph, "a2", "Люблю историю и архитектуру")
    text2 = _text(interrupt2)
    assert result2["candidate_destinations"]
    assert "период" in text2.lower()
    assert "бюджет" in text2.lower()
    assert "сколько человек" not in text2.lower()
    assert "какой отдых" not in text2.lower()
    assert result2["date_options"]


def test_preferences_without_city_suggests_matching_cities(graph):
    _, _ = _first_turn(graph, "a3")
    result, interrupt = _resume(graph, "a3", "Люблю историю и архитектуру")
    text = _text(interrupt)
    cities = {c.city for c in result["candidate_destinations"]}
    assert cities
    for city in cities:
        assert "history" in ds.get_destination_by_city(city).vibes
    assert "Сколько человек" in text
    assert "бюджет" in text.lower()
    assert result["user_request"].destination is None


def test_no_preference_does_not_loop(graph):
    _, _ = _first_turn(graph, "a4")
    result, interrupt = _resume(graph, "a4", "мне всё равно, предложи варианты")
    text = _text(interrupt)
    assert result["user_request"].preference_status == "no_preference"
    assert len(result["candidate_destinations"]) == 3
    assert "какой отдых" not in text.lower()


def test_explicit_city_skips_vibe_question(graph):
    result, interrupt = _start(graph, "a5", "Хочу в Рим")
    text = _text(interrupt)
    assert result["user_request"].destination == "Rome"
    assert result["destination_confirmed"] is True
    assert "какой отдых" not in text.lower()
    assert "Сколько человек" in text


# --------------------------------------------------------------------------
# B. Группировка вопросов и персистентность
# --------------------------------------------------------------------------
def test_grouped_questions_and_partial_answers(graph):
    # Только город → один сгруппированный вопрос.
    result, interrupt = _start(graph, "b1", "Хочу в Рим")
    text = _text(interrupt)
    assert text.count("1.") == 1 and "2." in text
    assert "На какие даты" in text

    # Ответ только датами: даты сохраняются, остальные вопросы остаются.
    result2, interrupt2 = _resume(graph, "b1", "10-17 декабря")
    text2 = _text(interrupt2)
    assert result2["user_request"].date_preferences.exact_dates
    assert "На какие даты" not in text2
    assert "Сколько человек" in text2
    assert "бюджет" in text2.lower()

    # Ответ только про путешественников.
    result3, interrupt3 = _resume(graph, "b1", "нас двое")
    text3 = _text(interrupt3)
    assert result3["user_request"].travelers == 2
    assert "Сколько человек" not in text3
    assert "бюджет" in text3.lower()

    # Бюджет закрывает запрос → сверка, поиска ещё нет.
    result4, interrupt4 = _resume(graph, "b1", "бюджет 150 тысяч")
    assert "сверимся" in _text(interrupt4).lower()
    assert result4["trip_options"] == []
    assert result4["last_validation"].ready_for_confirmation is True

    # Подтверждение запускает ровно один поиск.
    result5, interrupt5 = _resume(graph, "b1", "да, всё верно")
    assert not interrupt5
    assert result5["planning_status"] == "results_ready"
    assert len(result5["trip_options"]) == 3
    assert result5["aggregate_calls"] == 1


def test_travelers_correction_keeps_other_fields(graph):
    _start(graph, "b2", "Рим, 10-17 декабря, нас двое")
    _, interrupt = _resume(graph, "b2", "бюджет не важен")
    assert "сверимся" in _text(interrupt).lower()

    result, interrupt2 = _resume(graph, "b2", "всё-таки нас трое")
    req = result["user_request"]
    assert req.travelers == 3
    assert req.travelers_provided is True
    assert req.destination == "Rome"
    assert req.date_preferences.exact_dates
    assert req.budget_mode == "no_limit"
    assert "сверимся" in _text(interrupt2).lower()

    result2, interrupt3 = _resume(graph, "b2", "да")
    assert not interrupt3
    assert all(p["passengers"] == 3 for p in result2["trip_options"])


def test_constraints_absent_does_not_block(graph):
    result, interrupt = _start(
        graph, "b3", "Рим, 10-17 декабря, нас двое, бюджет 150 тысяч"
    )
    assert "сверимся" in _text(interrupt).lower()
    result2, _ = _resume(graph, "b3", "да")
    assert result2["user_request"].constraints == []
    assert result2["planning_status"] == "results_ready"


# --------------------------------------------------------------------------
# D/F. Город, даты и подтверждение
# --------------------------------------------------------------------------
def test_suggested_city_is_not_selected_until_explicit_choice(graph):
    _, _ = _first_turn(graph, "d1")
    result, _ = _resume(graph, "d1", "Люблю историю и архитектуру")
    assert result["candidate_destinations"]
    assert result["user_request"].destination is None
    assert result["trip_options"] == []

    # «нас двое» не выбирает город по номеру.
    result2, interrupt2 = _resume(graph, "d1", "нас двое")
    assert result2["user_request"].destination is None
    assert result2["candidate_destinations"]
    assert "город" in _text(interrupt2).lower()


def test_city_selection_by_name(graph):
    _, _ = _first_turn(graph, "d2")
    _, _ = _resume(graph, "d2", "Люблю историю и архитектуру")
    result, interrupt = _resume(graph, "d2", "Флоренция")
    assert result["user_request"].destination == "Florence"
    assert result["destination_confirmed"] is True
    assert result["candidate_destinations"] == []


def test_month_duration_generates_periods_and_requires_selection(graph):
    result, interrupt = _start(
        graph, "d3", "Хочу в Рим, в июле на 7 дней, нас двое, бюджет 200000."
    )
    text = _text(interrupt)
    assert "период" in text.lower()
    assert 2 <= len(result["date_options"]) <= 3
    assert result["trip_options"] == []

    result2, interrupt2 = _resume(graph, "d3", "Первый")
    assert result2["user_request"].date_preferences.exact_dates
    assert "сверимся" in _text(interrupt2).lower()
    assert result2["trip_options"] == []

    result3, _ = _resume(graph, "d3", "да")
    assert len(result3["trip_options"]) == 3
    assert result3["trip_options"][0]["nights"] == 7


def test_city_and_date_selection_in_one_answer(graph):
    _, _ = _first_turn(graph, "d4")
    result, interrupt = _resume(graph, "d4", "Люблю историю, в августе на неделю")
    assert result["candidate_destinations"] and result["date_options"]

    result2, interrupt2 = _resume(graph, "d4", "город 1, даты 1, нас двое")
    assert result2["user_request"].destination is not None
    assert result2["user_request"].date_preferences.exact_dates
    assert "бюджет" in _text(interrupt2).lower()

    result3, interrupt3 = _resume(graph, "d4", "бюджет 150 тысяч")
    assert "сверимся" in _text(interrupt3).lower()
    result4, _ = _resume(graph, "d4", "да")
    assert result4["planning_status"] == "results_ready"


def test_unknown_city_explained_and_not_searched(graph):
    result, interrupt = _start(
        graph, "d5", "Хочу в Токио на 10-17 декабря, нас двое"
    )
    text = _text(interrupt)
    assert result["user_request"].destination == "Токио"
    assert "Этого города нет" in text
    assert result["trip_options"] == []

    result2, interrupt2 = _resume(graph, "d5", "бюджет не важен")
    assert "Этого города нет" in _text(interrupt2)
    assert result2["trip_options"] == []

    # Выбор поддерживаемого города снимает блокировку.
    result3, interrupt3 = _resume(graph, "d5", "Рим")
    assert result3["user_request"].destination == "Rome"
    assert "сверимся" in _text(interrupt3).lower()


def test_confirmation_required_and_correction_resets(graph):
    result, interrupt = _start(
        graph, "f1", "Рим, 10-17 декабря, нас двое, бюджет 150 тысяч"
    )
    assert "сверимся" in _text(interrupt).lower()
    assert result["trip_options"] == []
    assert result["request_confirmed"] is False

    result2, _ = _resume(graph, "f1", "да, всё верно")
    assert result2["planning_status"] == "results_ready"
    assert result2["user_request"].destination == "Rome"

    # Исправление города сбрасывает прежний результат и подтверждение.
    result3, interrupt3 = _start(graph, "f1", "давайте Париж")
    assert result3["user_request"].destination == "Paris"
    assert result3["trip_options"] == []
    assert result3["request_confirmed"] is False
    assert "Париж" in _text(interrupt3)

    result4, _ = _resume(graph, "f1", "да")
    assert result4["planning_status"] == "results_ready"
    assert all(p["destination"] == "Paris" for p in result4["trip_options"])


def test_repeated_same_request_is_not_duplicated(graph):
    _start(graph, "f2", "Рим, 10-17 декабря, нас двое, бюджет 150 тысяч")
    result, _ = _resume(graph, "f2", "да")
    assert len(result["trip_options"]) == 3
    assert result["search_diagnostics"]["calls"] == 1
    assert result["search_diagnostics"]["results_before_dedup"] == 3
    assert result["search_diagnostics"]["results_after_dedup"] == 3

    result2, _ = _start(graph, "f2", "спасибо")
    assert len(result2["trip_options"]) == 3
    assert result2["search_diagnostics"]["calls"] == 0
    assert result2["aggregate_calls"] == 1


# --------------------------------------------------------------------------
# E. Бюджет
# --------------------------------------------------------------------------
def test_missing_budget_blocks_until_answered(graph):
    result, interrupt = _start(graph, "e1", "Рим, 10-17 декабря, нас двое")
    assert "бюджет" in _text(interrupt).lower()
    assert result["trip_options"] == []


def test_flexible_budget_single_pass_three_packages(graph):
    _start(graph, "e2", "Рим, 10-17 декабря, нас двое")
    result, interrupt = _resume(
        graph, "e2", "бюджет пока не знаю, покажи варианты по стоимости"
    )
    assert result["user_request"].budget_mode == "flexible_scenarios"
    assert "разных ценовых" in _text(interrupt)
    result2, _ = _resume(graph, "e2", "да")
    types = [p["package_type"] for p in result2["trip_options"]]
    assert sorted(types) == sorted(["Эконом", "Оптимальный", "Комфорт"])
    assert len(types) == len(set(types))
    assert result2["search_diagnostics"]["calls"] == 1


def test_no_limit_single_pass_three_packages(graph):
    _start(graph, "e3", "Рим, 10-17 декабря, нас двое")
    result, interrupt = _resume(graph, "e3", "бюджет не важен")
    assert result["user_request"].budget_mode == "no_limit"
    assert "без бюджетного ограничения" in _text(interrupt)
    result2, _ = _resume(graph, "e3", "да")
    assert len(result2["trip_options"]) == 3
    assert result2["search_diagnostics"]["calls"] == 1


def test_budget_range_preserved_and_used_as_limit(graph):
    result, interrupt = _start(
        graph, "e4", "Рим, 10-17 декабря, нас двое, бюджет 100-150 тысяч"
    )
    req = result["user_request"]
    assert req.budget_range == (100000, 150000)
    assert req.budget is None
    assert "сверимся" in _text(interrupt).lower()
    result2, _ = _resume(graph, "e4", "да")
    assert result2["search_diagnostics"]["budget_mode"] == "specified"


def test_travelers_not_silently_defaulted(graph):
    result, interrupt = _start(graph, "e5", "Хочу в Рим на неделю")
    req = result["user_request"]
    assert req.travelers == 1
    assert req.travelers_provided is False
    assert "Сколько человек" in _text(interrupt)
    assert result["trip_options"] == []

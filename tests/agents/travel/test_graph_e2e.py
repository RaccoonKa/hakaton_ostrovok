"""
End-to-end тесты графа travel-agent.

Используют in-memory checkpointer и реальный граф (без LLM): логика
полностью deterministic. Покрывают interrupt → resume, выбор города,
выбор дат, несколько ответов за один ход, изменение параметров и
неизвестный город.
"""

from __future__ import annotations

import pytest
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from agents.travel.graph import build_travel_graph


@pytest.fixture
def graph():
    return build_travel_graph(checkpointer=InMemorySaver())


def _run_turn(graph, thread_id: str, message: str) -> tuple[dict, object]:
    """Выполнить ход; вернуть (state_values, interrupt)."""
    config = {"configurable": {"thread_id": thread_id}}
    result = graph.invoke({"messages": [HumanMessage(content=message)]}, config)
    return result, result.get("__interrupt__")


def _resume(graph, thread_id: str, message: str) -> tuple[dict, object]:
    config = {"configurable": {"thread_id": thread_id}}
    result = graph.invoke(Command(resume=message), config)
    return result, result.get("__interrupt__")


def _interrupt_text(interrupt) -> str:
    if not interrupt:
        return ""
    # interrupt — tuple/list of Interrupt
    first = interrupt[0] if isinstance(interrupt, (list, tuple)) else interrupt
    return getattr(first, "value", str(first))


def test_e2e_all_at_once_ready(graph):
    """Test 1: всё сразу → агрегатор без вопросов."""
    result, interrupt = _run_turn(
        graph,
        "t-all",
        "Хочу в Рим на 10-17 августа, нас двое, бюджет 2000 евро, хороший отель в центре.",
    )
    assert not interrupt
    assert result["planning_status"] == "results_ready"
    assert len(result["trip_options"]) == 3
    req = result["user_request"]
    assert req.destination == "Rome"
    assert req.travelers == 2


def test_e2e_city_only_asks_grouped(graph):
    """Test 2: только город → один сгруппированный вопрос."""
    result, interrupt = _run_turn(graph, "t-city", "Хочу в Париж.")
    assert interrupt
    text = _interrupt_text(interrupt)
    assert "даты" in text.lower() or "даты" in text.lower()
    # Несколько вопросов в одном сообщении.
    assert text.count("1.") == 1 and "2." in text


def test_e2e_country_suggests_cities(graph):
    """Test 3: только страна → предложение городов, агрегатор не вызывается."""
    result, interrupt = _run_turn(graph, "t-country", "Хочу в Италию.")
    assert interrupt
    text = _interrupt_text(interrupt)
    assert "Rome" in text or "Milan" in text or "Florence" in text
    assert result.get("trip_options", []) == []
    assert result["user_request"].destination is None


def test_e2e_preferences_without_destination(graph):
    """Test 4: preferences без города → 3 города."""
    result, interrupt = _run_turn(
        graph, "t-prefs", "Хочу море, тепло и красивую природу."
    )
    assert interrupt
    candidates = result["candidate_destinations"]
    assert len(candidates) >= 3


def test_e2e_origin_only_grouped(graph):
    """Test 5: только origin → сгруппированные вопросы."""
    result, interrupt = _run_turn(graph, "t-origin", "Вылетаю из Москвы.")
    assert interrupt
    text = _interrupt_text(interrupt)
    assert "1." in text


def test_e2e_missing_travelers_defaults_to_one(graph):
    """Test 8: нет travelers → 1, не спрашиваем при наличии дат/ budgets."""
    result, interrupt = _run_turn(
        graph, "t-trav", "Я хочу съездить в Рим на неделю."
    )
    req = result["user_request"]
    assert req.travelers == 1


def test_e2e_month_duration_date_selection(graph):
    """Test 6: месяц + duration → выбор периода → затем результат."""
    result, interrupt = _run_turn(
        graph, "t-dates", "Хочу в Рим, в июле на 7 дней, двое, бюджет 200000."
    )
    assert interrupt
    text = _interrupt_text(interrupt)
    assert "период" in text.lower()
    date_options = result["date_options"]
    assert 2 <= len(date_options) <= 3

    result2, interrupt2 = _resume(graph, "t-dates", "Первый")
    assert not interrupt2
    assert result2["planning_status"] == "results_ready"
    assert len(result2["trip_options"]) >= 3


def test_e2e_multiple_answers_one_turn(graph):
    """Test 11/23: пользователь закрывает несколько вопросов одним ответом."""
    result, interrupt = _run_turn(graph, "t-multi", "Хочу в Париж.")
    assert interrupt

    result2, interrupt2 = _resume(graph, "t-multi", "10-17 августа, нас двое, бюджет 2000 евро")
    assert not interrupt2
    assert result2["planning_status"] == "results_ready"
    req = result2["user_request"]
    assert req.destination == "Paris"
    assert req.travelers == 2
    assert req.budget == 2000


def test_e2e_destination_selection(graph):
    """Test 8 (раздел): выбор города среди предложенных."""
    result, interrupt = _run_turn(graph, "t-sel", "Хочу в Италию.")
    assert interrupt
    result2, interrupt2 = _resume(graph, "t-sel", "Первый")
    assert result2["user_request"].destination in {"Rome", "Milan", "Florence", "Venice"}


def test_e2e_change_existing_value(graph):
    """Test 12/24: изменение ранее указанных параметров."""
    result, interrupt = _run_turn(graph, "t-change", "Хочу в Париж.")
    assert interrupt
    # Пользователь заполняет даты и число людей за один ответ.
    result2, interrupt2 = _resume(graph, "t-change", "10-17 августа, нас двое")
    # Бюджет опционален → запрос готов, interrupt не нужен.
    assert not interrupt2
    assert result2["planning_status"] == "results_ready"

    # Пользователь меняет город и число людей (без сохранения бюджета).
    result3, _ = _run_turn(graph, "t-change", "Нет, давайте Рим и нас трое")
    req = result3["user_request"]
    assert req.destination == "Rome"
    assert req.travelers == 3
    # Даты сохранились.
    assert req.date_preferences.exact_dates


def test_e2e_unknown_city_not_invented(graph):
    """Город, которого нет в dataset, не даёт выдуманного результата."""
    result, interrupt = _run_turn(graph, "t-unknown", "Хочу в Токио на 10-17 августа, нас двое.")
    assert interrupt
    assert result["user_request"].destination is None
    assert result.get("trip_options", []) == []


def test_e2e_budget_scenarios_when_no_budget(graph):
    """Test 10: нет бюджета → несколько сценариев."""
    result, interrupt = _run_turn(
        graph, "t-budget", "Хочу в Рим на 10-17 августа, нас двое, бюджет пока не знаю."
    )
    assert not interrupt
    assert result["planning_status"] == "results_ready"
    scenarios = {p.get("budget_scenario") for p in result["trip_options"]}
    assert {"economy", "optimal", "comfort"}.issubset(scenarios)


def test_e2e_constraints_absent_does_not_block(graph):
    """Test 13: отсутствие constraints не блокирует поиск."""
    result, interrupt = _run_turn(
        graph, "t-no-constraints", "Рим, 10-17 августа, двое, бюджет 150 тысяч."
    )
    assert not interrupt
    assert result["user_request"].constraints == []
    assert result["planning_status"] == "results_ready"


def test_e2e_results_not_replaced_on_multiple_searches(graph):
    """Test 35: несколько поисков объединяются (не затирают друг друга)."""
    result, interrupt = _run_turn(
        graph, "t-multi-search", "Хочу в Рим на 10-17 августа, нас двое, бюджет пока не знаю."
    )
    assert not interrupt
    # 3 бюджетных сценария × 3 пакета = 9 вариантов.
    assert len(result["trip_options"]) >= 9
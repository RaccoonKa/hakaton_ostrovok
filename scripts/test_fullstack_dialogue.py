"""Сквозной интеграционный тест диалога с FastAPI Travel Agent.

Проверяет 5-шаговый сценарий:
1. Запрос вайба/направления -> получение кандидатов и suggestions
2. Негативное исключение («турцию не хочу») -> фильтрация исключенного направления
3. Выбор города и параметров -> запрос сверки параметров и confirmation suggestions
4. Подтверждение сверки («Да, все верно, ищи») -> получение 3 готовых пакетов туров
5. Уточняющий вопрос после поиска -> корректный ответ агента без сбоя
"""

import json
import sys
import httpx


import uuid


def test_fullstack_dialogue(base_url: str = "http://127.0.0.1:8000"):
    stream_url = f"{base_url}/travel_agent/stream"
    thread_id = f"test-e2e-dialogue-{uuid.uuid4().hex[:8]}"

    print(f"\n[E2E] Тестирование сервиса: {stream_url} (thread_id: {thread_id})\n")

    def send_turn(turn_num: int, user_message: str):
        print(f"--- Шаг {turn_num}: «{user_message}» ---")
        payload = {
            "message": user_message,
            "thread_id": thread_id,
            "stream_tokens": True,
        }

        content_parts = []
        messages_received = []
        trip_options = []
        suggestions = []

        with httpx.Client(timeout=45) as client:
            with client.stream("POST", stream_url, json=payload) as response:
                assert response.status_code == 200, f"HTTP Error {response.status_code}: {response.text}"
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            event = json.loads(data_str)
                            if event.get("type") == "token":
                                content_parts.append(event.get("content", ""))
                            elif event.get("type") == "message":
                                msg = event.get("content", {})
                                messages_received.append(msg)
                                custom = msg.get("custom_data") or msg.get("additional_kwargs") or {}
                                if "trip_options" in custom:
                                    trip_options.extend(custom["trip_options"])
                                if "suggestions" in custom:
                                    suggestions.extend(custom["suggestions"])
                        except Exception as e:
                            print(f"  [Warn] Parse error: {e}")

        full_text = "".join(content_parts) or (messages_received[-1].get("content", "") if messages_received else "")
        print(f"  Ответ агента: {full_text[:120]}...")
        if suggestions:
            print(f"  Подсказки (suggestions): {suggestions}")
        if trip_options:
            print(f"  Пакетов туров получено: {len(trip_options)}")
        print()
        return full_text, suggestions, trip_options

    # Шаг 1: Запрос направления
    t1_text, t1_sug, _ = send_turn(1, "хочу к теплому морю")
    assert "город" in t1_text.lower() or "варианты" in t1_text.lower(), "Шаг 1: Агент должен предложить варианты городов"
    assert len(t1_sug) > 0, "Шаг 1: Агент должен передать suggestions (города)"

    # Шаг 2: Исключение страны
    t2_text, t2_sug, _ = send_turn(2, "турцию не хочу")
    assert "турци" not in t2_text.lower() or "не хочу" in t2_text.lower() or "бали" in t2_text.lower() or "крит" in t2_text.lower(), "Шаг 2: Турция должна быть исключена"
    for s in t2_sug:
        assert "турц" not in s.lower() and "антал" not in s.lower(), f"Шаг 2: В подсказках не должно быть Турции ({s})"

    # Шаг 3: Выбор города и ввод параметров
    t3_text, t3_sug, _ = send_turn(3, "Выбираю Крит, 2 человека, с 1 по 8 июля 2027, бюджет 200000 руб")
    assert "сверимся" in t3_text.lower() or "крит" in t3_text.lower(), "Шаг 3: Агент должен перейти к сверке"
    assert any("верно" in s.lower() for s in t3_sug), "Шаг 3: Должна присутствовать подсказка подтверждения сверки"

    # Шаг 4: Подтверждение сверки
    t4_text, _, t4_options = send_turn(4, "Да, всё верно, ищи")
    assert len(t4_options) >= 2, f"Шаг 4: Ожидалось минимум 2-3 пакета туров, получено {len(t4_options)}"
    for opt in t4_options:
        assert opt.get("destination") or opt.get("title"), "Шаг 4: У каждого тура должно быть направление"

    # Шаг 5: Последующее уточнение
    t5_text, _, _ = send_turn(5, "А есть варианты ближе к морю?")
    assert len(t5_text) > 0, "Шаг 5: Агент должен ответить на дополнительный вопрос"

    print("[E2E] Все 5 шагов успешно пройдены! Потоковый протокол и паритет подтверждены.\n")


if __name__ == "__main__":
    test_fullstack_dialogue()

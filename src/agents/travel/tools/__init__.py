"""
Набор инструментов travel-agent.

Все инструменты используют единый mock dataset
(:mod:`agents.travel.tools.mock_dataset`) и не выдумывают сущности,
которых в нём нет.

Импорт инструментов ленивый (PEP 562), чтобы избежать циклической
зависимости между пакетом ``tools`` и пакетом ``logic``:
``logic.decision`` импортирует ``tools.mock_dataset``, а инструменты —
``logic.decision``.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any

_LAZY_EXPORTS: dict[str, tuple[str, str]] = {
    "search_destinations": (".destinations", "search_destinations"),
    "suggest_destinations_tool": (".destinations", "suggest_destinations_tool"),
    "suggest_date_ranges_tool": (".dates", "suggest_date_ranges_tool"),
    "validate_travel_request_tool": (".validation", "validate_travel_request_tool"),
    "search_and_package_trip": (".packaging", "search_and_package_trip"),
    "assert_aggregator_ready": (".packaging", "assert_aggregator_ready"),
    "AggregatorNotReadyError": (".packaging", "AggregatorNotReadyError"),
}


def get_travel_tools() -> list[Any]:
    """Собрать список инструментов для agent (лениво)."""
    return [
        __getattr__("search_destinations"),
        __getattr__("suggest_destinations_tool"),
        __getattr__("suggest_date_ranges_tool"),
        __getattr__("validate_travel_request_tool"),
        __getattr__("search_and_package_trip"),
    ]


def __getattr__(name: str) -> Any:
    if name == "TRAVEL_TOOLS":
        return get_travel_tools()
    if name in _LAZY_EXPORTS:
        module_name, attr = _LAZY_EXPORTS[name]
        module = import_module(module_name, __package__)
        return getattr(module, attr)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "TRAVEL_TOOLS",
    "AggregatorNotReadyError",
    "assert_aggregator_ready",
    "get_travel_tools",
    "search_and_package_trip",
    "search_destinations",
    "suggest_date_ranges_tool",
    "suggest_destinations_tool",
    "validate_travel_request_tool",
]

"""
Провайдер подбора трансферов с поддержкой PostgreSQL и fallback на data/transfers.json.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Any

from domain.common import Currency, TransportType
from domain.transfer import Transfer
from memory.db_storage import fetch_payloads, get_data_dir, is_db_available

logger = logging.getLogger(__name__)


def _load_raw_transfers() -> list[dict[str, Any]]:
    """
    Загружает сырые записи трансферов:
    сначала пробует PostgreSQL, при недоступности читает data/transfers.json.
    """
    if is_db_available():
        payloads = fetch_payloads("SELECT payload FROM transfers")
        if payloads is not None:
            return payloads

    data_dir = get_data_dir()
    transfers_file = data_dir / "transfers.json"
    if not transfers_file.exists():
        logger.warning("Transfers data file %s not found.", transfers_file)
        return []

    with open(transfers_file, encoding="utf-8") as f:
        transfers: list[dict[str, Any]] = json.load(f)

    return transfers


def _match_hub(tr: dict[str, Any], hub: str) -> bool:
    """Проверяет совпадение транспортного хаба."""
    h = hub.strip().lower()
    tr_hub = tr.get("hub_id", "").lower()
    tr_orig = tr.get("origin", "").lower()

    return (h == tr_hub) or (h in tr_orig) or (tr_hub in h)


def _match_transfer_destination(tr: dict[str, Any], destination: str) -> bool:
    """Проверяет соответствие точки назначения или отеля."""
    d = destination.strip().lower()
    tr_dest = tr.get("destination", "").lower()
    hotels = [h.lower() for h in tr.get("destination_hotels", [])]

    if d in tr_dest or tr_dest in d:
        return True
    if any(d in h or h in d for h in hotels):
        return True

    # Сопоставление по ключевым курортным локациям
    for kw in (
        "полян",
        "роза",
        "сириус",
        "центр",
        "адлер",
        "светлогорск",
        "янтарн",
        "зеленоградск",
        "лахта",
        "петергоф",
        "белек",
        "кемер",
        "лара",
        "бейглу",
        "султанахмет",
    ):
        if kw in d and kw in tr_dest:
            return True

    return False


def get_transfer(
    hub: str,
    destination: str,
    arrival_at: datetime | str,
    transport_type: str = "flight",
    travelers: int = 1,
    has_kids: bool = False,
    has_sports_equipment: bool = False,
) -> Transfer | None:
    """
    Подбирает оптимальный трансфер с учётом буферного времени и требуемого класса авто.
    - Буфер: +30 мин для самолёта, +15 мин для поезда.
    - Класс авто: при travelers > 3, наличии детей или спортинвентаря выбирается minivan.
    """
    arr_dt = (
        datetime.fromisoformat(arrival_at)
        if isinstance(arrival_at, str)
        else arrival_at
    )

    # Расчет буферного времени на получение багажа и выход к трансферу
    t_type = transport_type.lower()
    if t_type in ("flight", "plane", "airplane"):
        buffer_minutes = 30
    elif t_type in ("train", "railway"):
        buffer_minutes = 15
    else:
        buffer_minutes = 20

    dep_dt = arr_dt + timedelta(minutes=buffer_minutes)

    # Определение приоритета классов автомобилей
    if travelers > 3 or has_kids or has_sports_equipment:
        class_preferences = ["minivan", "comfort", "economy"]
    else:
        class_preferences = ["comfort", "economy", "minivan"]

    raw_transfers = _load_raw_transfers()
    matching_transfers = [
        tr
        for tr in raw_transfers
        if _match_hub(tr, hub) and _match_transfer_destination(tr, destination)
    ]

    if not matching_transfers:
        return None

    # Выбор трансфера по приоритету классов
    chosen_tr = None
    for target_class in class_preferences:
        for tr in matching_transfers:
            if tr.get("vehicle_class") == target_class:
                chosen_tr = tr
                break
        if chosen_tr is not None:
            break

    if chosen_tr is None:
        chosen_tr = matching_transfers[0]

    duration_minutes = int(chosen_tr.get("duration_minutes", 45))
    dur = timedelta(minutes=duration_minutes)
    transfer_arr_dt = dep_dt + dur

    raw_tr_type = chosen_tr.get("transport_type", "taxi")
    tr_type_enum = (
        TransportType.TAXI
        if raw_tr_type == "taxi"
        else TransportType.SHUTTLE
        if raw_tr_type == "shuttle"
        else TransportType.CAR
    )

    conditions = (
        f"Класс: {chosen_tr.get('vehicle_class')}. {chosen_tr.get('notes', '')}".strip()
    )

    return Transfer(
        origin=chosen_tr["origin"],
        destination=chosen_tr["destination"],
        departure_at=dep_dt,
        arrival_at=transfer_arr_dt,
        duration=dur,
        transport_type=tr_type_enum,
        price=float(chosen_tr.get("price", 0.0)),
        currency=Currency(chosen_tr["currency"])
        if chosen_tr.get("currency")
        else Currency.RUB,
        conditions=conditions,
    )

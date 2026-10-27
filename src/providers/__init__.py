"""
Внешние источники и адаптеры поставщиков туристических данных.
"""

from .destinations import get_destinations
from .flights import search_flights
from .hotels import calculate_hotel_price, search_hotels
from .trains import search_trains
from .transfers import get_transfer

__all__ = [
    "calculate_hotel_price",
    "get_destinations",
    "get_transfer",
    "search_flights",
    "search_hotels",
    "search_trains",
]

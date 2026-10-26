"""
Доменные модели Travel Agent (поездка, авиабилет, отель, трансфер, маршрут).

Здесь собраны Pydantic-схемы домена, которые описывают данные, но не
содержат бизнес-логики, методов и работы с внешними сервисами.
"""

from domain.common import Currency, MealPlan, Priority, TransportType
from domain.constraint import Constraint
from domain.flight import Flight
from domain.hotel import Hotel
from domain.itinerary import Itinerary
from domain.preference import Preference
from domain.request import UserRequest
from domain.route import RouteStop
from domain.transfer import Transfer
from domain.transport import Transport
from domain.trip import TripBudget, TripOption

__all__ = [
    "Currency",
    "MealPlan",
    "Priority",
    "TransportType",
    "Constraint",
    "Flight",
    "Hotel",
    "Itinerary",
    "Preference",
    "UserRequest",
    "RouteStop",
    "Transfer",
    "Transport",
    "TripBudget",
    "TripOption",
]

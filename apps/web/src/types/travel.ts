import {
  TripOption,
  Flight,
  Hotel,
  Transport,
  Transfer,
  RouteStop,
  ChatMessage,
  Currency,
  MealPlan,
  TransportType,
  UserRequest,
  Itinerary,
  TripBudget,
} from "@corvax/shared";

// Re-export enums as values
export { Currency, MealPlan, TransportType };

export type {
  TripOption,
  Flight,
  Hotel,
  Transport,
  Transfer,
  RouteStop,
  ChatMessage,
  UserRequest,
  Itinerary,
  TripBudget,
};

export type AgentStepPhase =
  | "idle"
  | "analyzing_flights"
  | "finding_hotels"
  | "calculating_budget"
  | "ready";

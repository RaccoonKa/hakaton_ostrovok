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

// Domain type aliases specified in requirements
export type FlightOption = Flight;
export type HotelOption = Hotel;
export type TravelStep = RouteStop;

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

export const DEMO_DISCLAIMER_TEXT =
  "О!дин запрос работает в демонстрационном режиме. Бронирования, тарифы и наличие мест симулируются для тестирования сценариев.";

export interface HistorySessionItem {
  id: string;
  title: string;
  dateGroup: "today" | "yesterday" | "past7days";
  query: string;
  createdAt: string;
}

export interface BookingConfirmation {
  pnr: string;
  hotelConfirmation: string;
  tripOption: TripOption;
  travelers: string[];
  totalAmount: number;
  currency: Currency;
  isDemo: true;
  confirmedAt: string;
}

export type AgentStepPhase =
  | "idle"
  | "analyzing_flights"
  | "finding_hotels"
  | "calculating_budget"
  | "ready";

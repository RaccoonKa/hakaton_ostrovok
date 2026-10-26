import {
  TripOption,
  Flight,
  Hotel,
  RouteStop,
  Transfer,
  Transport,
  Itinerary,
  TripBudget,
  Currency,
  UserRequest,
  ChatMessage,
  TravelState,
} from "@corvax/shared";

// Domain type aliases for flexible imports
export type FlightOption = Flight;
export type HotelOption = Hotel;
export type TravelStep = RouteStop;

export type {
  TripOption,
  Flight,
  Hotel,
  RouteStop,
  Transfer,
  Transport,
  Itinerary,
  TripBudget,
  UserRequest,
  ChatMessage,
  TravelState,
};

// Re-export runtime enum
export { Currency };

export const DEMO_DISCLAIMER_TEXT =
  "Все параметры смоделированы ИИ «О!дин запрос». Реальное списание средств не производится.";

export interface MobileChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  tripOptions?: TripOption[];
  selectedOption?: TripOption;
}

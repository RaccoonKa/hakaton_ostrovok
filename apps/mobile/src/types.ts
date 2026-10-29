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
  UnifiedChatMessage,
  TravelState,
} from "@corvax/shared";

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

export type MobileChatMessage = UnifiedChatMessage;

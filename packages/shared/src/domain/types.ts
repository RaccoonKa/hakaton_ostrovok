import {
  Currency,
  MealPlan,
  Month,
  Priority,
  Season,
  TransportType,
} from "./constants";

export { Currency, MealPlan, Month, Priority, Season, TransportType };

export interface Preference {
  name: string;
  priority?: Priority;
}

export interface DatePreferences {
  exact_dates?: string[] | null;
  start_date?: string | null;
  end_date?: string | null;
  season?: Season[] | null;
  month?: Month[] | null;
}

export interface Constraint {
  name: string;
  value?: unknown;
  hard?: boolean;
}

export interface UserRequest {
  origin?: string | null;
  destination?: string | null;
  destination_country?: string | null;
  destination_ambiguous?: boolean;
  date_preferences?: DatePreferences;
  duration?: number | null;
  travelers?: number;
  traveler_range?: [number, number] | null;
  travelers_provided?: boolean;
  adults?: number | null;
  children?: number | null;
  budget?: number | null;
  budget_range?: [number, number] | null;
  budget_mode?: "unknown" | "specified" | "no_limit" | "flexible_scenarios";
  currency?: Currency | null;
  preferences?: Preference[];
  preference_status?: "unknown" | "specified" | "no_preference";
  constraints?: Constraint[];
  preferred_transport?: TransportType | null;
  hotel_requirements?: string[];
}

export interface RouteStop {
  city: string;
  country?: string | null;
  arrival_date?: string | null;
  departure_date?: string | null;
  nights?: number | null;
  order?: number;
}

export interface Flight {
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration?: string | null;
  carrier?: string | null;
  flight_number?: string | null;
  stops?: number;
  baggage?: string | null;
  price?: number | null;
  currency?: Currency | null;
  refundable?: boolean | null;
  changeable?: boolean | null;
  transit_point?: string | null;
  layover_duration?: string | null;
}

export interface Hotel {
  hotel: string;
  city: string;
  district?: string | null;
  check_in: string;
  check_out: string;
  check_in_time?: string;
  check_out_time?: string;
  guests?: number;
  room_type?: string | null;
  meal_plan?: MealPlan | null;
  price?: number | null;
  currency?: Currency | null;
  refundable?: boolean | null;
  free_cancellation?: boolean;
  cancellation_conditions?: string | null;
  non_refundable_discount_pct?: number;
  early_check_in_fee?: number;
  pet_friendly?: boolean;
  pet_fee_per_night?: number;
  amenities?: string[];
  rating?: number | null;
  image_url?: string | null;
}

export interface Transfer {
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration?: string | null;
  transport_type?: TransportType | null;
  price?: number | null;
  currency?: Currency | null;
  conditions?: string | null;
}

export interface Transport {
  origin: string;
  destination: string;
  departure_at: string;
  arrival_at: string;
  duration?: string | null;
  transport_type?: TransportType | null;
  carrier?: string | null;
  price?: number | null;
  currency?: Currency | null;
  conditions?: string | null;
  stops?: number;
  transit_point?: string | null;
  layover_duration?: string | null;
}

export interface Itinerary {
  stops?: RouteStop[];
  flights?: Flight[];
  hotels?: Hotel[];
  transport?: Transport[];
  transports?: Transport[];
  transfers?: Transfer[];
}

export interface TripBudget {
  flights_total?: number | null;
  hotels_total?: number | null;
  transport_total?: number | null;
  transfers_total?: number | null;
  other_total?: number | null;
  total?: number | null;
  currency?: Currency | null;
}

export interface TripOption {
  id?: string;
  title?: string;
  description?: string;
  destination?: string;
  flights?: Flight[];
  hotels?: Hotel[];
  transport?: Transport[];
  transports?: Transport[];
  transfers?: Transfer[];
  stops?: RouteStop[];
  itinerary?: Itinerary | null;
  budget?: TripBudget | null;
  total_price?: number | null;
  currency?: Currency | null;
  score?: number | null;
  isDemo?: boolean;
}

export interface TravelState {
  user_request?: UserRequest | null;
  candidate_destinations?: string[];
  trip_options?: TripOption[];
  selected_option?: TripOption | null;
  itinerary?: Itinerary | null;
  unresolved_questions?: string[];
  messages?: string[];
}

export interface UnifiedChatMessage {
  id: string;
  type?: "human" | "ai" | "tool" | "custom";
  role?: "user" | "assistant" | "system";
  content: string;
  run_id?: string | null;
  tool_calls?: Array<{
    name: string;
    args: Record<string, unknown>;
    id?: string | null;
  }>;
  custom_data?: {
    trip_options?: TripOption[];
    selected_option?: TripOption;
    itinerary?: Itinerary;
    unresolved_questions?: string[];
    is_demo?: boolean;
    suggestions?: string[];
    stage?: string;
    [key: string]: unknown;
  };
  created_at?: string;
  timestamp?: string;
  trip_options?: TripOption[];
  tripOptions?: TripOption[]; // camelCase alias for mobile compatibility
  suggestions?: string[];
  is_thinking?: boolean;
  isThinking?: boolean;       // camelCase alias for mobile compatibility
  thinking_step?: string;
  thinkingStep?: string;       // camelCase alias for mobile compatibility
  thinking_text?: string;
  thinkingText?: string;       // camelCase alias for mobile compatibility
}

export type ChatMessage = UnifiedChatMessage;

export interface ServiceMetadata {
  agents: Array<{ key: string; description: string }>;
  models: string[];
  default_agent: string;
  default_model: string;
}

export interface DestinationCandidate {
  city: string;
  country: string;
  iata?: string | null;
  reason?: string;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface ValidationResult {
  ready?: boolean;
  ready_for_confirmation?: boolean;
  ready_for_search?: boolean;
  stage?: string;
  missing?: string[];
  missing_fields?: string[];
  decisions_required?: string[];
  questions?: string[];
  budget_scenarios?: number[];
  budget_mode?: string;
  preference_status?: string;
  reason?: string;
}

export type TravelPlanningStatus =
  | "collecting"
  | "awaiting_preferences"
  | "awaiting_destination_selection"
  | "awaiting_date_selection"
  | "awaiting_request_confirmation"
  | "ready_for_search"
  | "searching"
  | "results_ready";


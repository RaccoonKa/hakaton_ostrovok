import {
  Currency,
  MealPlan,
  Month,
  Priority,
  Season,
  TransportType,
} from "./constants";

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
  date_preferences?: DatePreferences;
  duration?: number | null;
  travelers?: number;
  budget?: number | null;
  budget_range?: [number, number] | null;
  currency?: Currency | null;
  preferences?: Preference[];
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
}

export interface Hotel {
  hotel: string;
  city: string;
  check_in: string;
  check_out: string;
  guests?: number;
  room_type?: string | null;
  meal_plan?: MealPlan | null;
  price?: number | null;
  currency?: Currency | null;
  refundable?: boolean | null;
  cancellation_conditions?: string | null;
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
}

export interface Itinerary {
  stops?: RouteStop[];
  flights?: Flight[];
  hotels?: Hotel[];
  transport?: Transport[];
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

export interface ChatMessage {
  id?: string;
  type: "human" | "ai" | "tool" | "custom";
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
    [key: string]: unknown;
  };
  created_at?: string;
}

export interface ServiceMetadata {
  agents: Array<{ key: string; description: string }>;
  models: string[];
  default_agent: string;
  default_model: string;
}

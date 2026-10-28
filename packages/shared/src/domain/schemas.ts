import { z } from "zod";
import {
  Currency,
  MealPlan,
  Month,
  Priority,
  Season,
  TransportType,
} from "./constants";

export const currencySchema = z.nativeEnum(Currency);
export const prioritySchema = z.nativeEnum(Priority);
export const transportTypeSchema = z.nativeEnum(TransportType);
export const mealPlanSchema = z.nativeEnum(MealPlan);
export const seasonSchema = z.nativeEnum(Season);
export const monthSchema = z.nativeEnum(Month);

export const preferenceSchema = z.object({
  name: z.string(),
  priority: prioritySchema.default(Priority.MEDIUM),
});

export const datePreferencesSchema = z.object({
  exact_dates: z.array(z.string()).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  season: z.array(seasonSchema).nullable().optional(),
  month: z.array(monthSchema).nullable().optional(),
});

export const constraintSchema = z.object({
  name: z.string(),
  value: z.unknown().optional(),
  hard: z.boolean().default(false),
});

export const userRequestSchema = z.object({
  origin: z.string().nullable().optional(),
  destination: z.string().nullable().optional(),
  date_preferences: datePreferencesSchema.default({}),
  duration: z.number().int().positive().nullable().optional(),
  travelers: z.number().int().positive().default(1),
  budget: z.number().positive().nullable().optional(),
  budget_range: z.tuple([z.number(), z.number()]).nullable().optional(),
  currency: currencySchema.nullable().optional(),
  preferences: z.array(preferenceSchema).default([]),
  constraints: z.array(constraintSchema).default([]),
  preferred_transport: transportTypeSchema.nullable().optional(),
  hotel_requirements: z.array(z.string()).default([]),
});

export const routeStopSchema = z.object({
  city: z.string(),
  country: z.string().nullable().optional(),
  arrival_date: z.string().nullable().optional(),
  departure_date: z.string().nullable().optional(),
  nights: z.number().int().nonnegative().nullable().optional(),
  order: z.number().int().nonnegative().default(0),
});

export const flightSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  departure_at: z.string(),
  arrival_at: z.string(),
  duration: z.string().nullable().optional(),
  carrier: z.string().nullable().optional(),
  flight_number: z.string().nullable().optional(),
  stops: z.number().int().nonnegative().default(0),
  baggage: z.string().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: currencySchema.nullable().optional(),
  refundable: z.boolean().nullable().optional(),
  changeable: z.boolean().nullable().optional(),
  transit_point: z.string().nullable().optional(),
  layover_duration: z.string().nullable().optional(),
});

export const hotelSchema = z.object({
  hotel: z.string(),
  city: z.string(),
  district: z.string().nullable().optional(),
  check_in: z.string(),
  check_out: z.string(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  guests: z.number().int().positive().default(1),
  room_type: z.string().nullable().optional(),
  meal_plan: mealPlanSchema.nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: currencySchema.nullable().optional(),
  refundable: z.boolean().nullable().optional(),
  free_cancellation: z.boolean().optional(),
  cancellation_conditions: z.string().nullable().optional(),
  non_refundable_discount_pct: z.number().optional(),
  early_check_in_fee: z.number().optional(),
  pet_friendly: z.boolean().optional(),
  pet_fee_per_night: z.number().optional(),
  amenities: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).nullable().optional(),
  image_url: z.string().nullable().optional(),
});

export const transferSchema = z.object({
  origin: z.string(),
  destination: z.string(),
  departure_at: z.string(),
  arrival_at: z.string(),
  duration: z.string().nullable().optional(),
  transport_type: transportTypeSchema.nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: currencySchema.nullable().optional(),
  conditions: z.string().nullable().optional(),
});

export const transportSchema = z.object({
  id: z.string().nullable().optional(),
  origin: z.string(),
  destination: z.string(),
  departure_at: z.string(),
  arrival_at: z.string(),
  duration: z.string().nullable().optional(),
  transport_type: transportTypeSchema.nullable().optional(),
  carrier: z.string().nullable().optional(),
  flight_number: z.string().nullable().optional(),
  baggage: z.string().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  currency: currencySchema.nullable().optional(),
  conditions: z.string().nullable().optional(),
  stops: z.number().int().nonnegative().default(0),
  transit_point: z.string().nullable().optional(),
  layover_duration: z.string().nullable().optional(),
});

export const itinerarySchema = z.object({
  stops: z.array(routeStopSchema).default([]),
  flights: z.array(flightSchema).default([]),
  hotels: z.array(hotelSchema).default([]),
  transport: z.array(transportSchema).default([]),
  transports: z.array(transportSchema).default([]).optional(),
  transfers: z.array(transferSchema).default([]),
});

export const tripBudgetSchema = z.object({
  flights_total: z.number().nullable().optional(),
  hotels_total: z.number().nullable().optional(),
  transport_total: z.number().nullable().optional(),
  transfers_total: z.number().nullable().optional(),
  other_total: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  currency: currencySchema.nullable().optional(),
});

export const tripOptionSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  destination: z.string().optional(),
  flights: z.array(flightSchema).default([]),
  hotels: z.array(hotelSchema).default([]),
  transport: z.array(transportSchema).default([]),
  transports: z.array(transportSchema).default([]).optional(),
  transfers: z.array(transferSchema).default([]),
  stops: z.array(routeStopSchema).default([]),
  itinerary: itinerarySchema.nullable().optional(),
  budget: tripBudgetSchema.nullable().optional(),
  total_price: z.number().nonnegative().nullable().optional(),
  currency: currencySchema.nullable().optional(),
  score: z.number().nullable().optional(),
  isDemo: z.boolean().default(false),
});

export const travelStateSchema = z.object({
  user_request: userRequestSchema.nullable().optional(),
  candidate_destinations: z.array(z.string()).default([]),
  trip_options: z.array(tripOptionSchema).default([]),
  selected_option: tripOptionSchema.nullable().optional(),
  itinerary: itinerarySchema.nullable().optional(),
  unresolved_questions: z.array(z.string()).default([]),
  messages: z.array(z.string()).default([]),
});

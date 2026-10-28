import { TripOption, Flight, Hotel } from "./types";
import { Currency } from "./constants";

/**
 * Нормализует сырой объект тура от бэкенда (как из mock_dataset / packaging,
 * так и канонический объект TripOption) к единому стандарту UI.
 */
export function normalizeTripOption(raw: any, index: number = 0): TripOption {
  if (!raw || typeof raw !== "object") {
    return {
      id: `opt-${index + 1}`,
      title: `Вариант ${index + 1}`,
      total_price: 0,
      currency: Currency.RUB,
    };
  }

  const id = raw.id || `opt-${index + 1}-${raw.package_type || "travel"}`;
  const title = raw.title || raw.package_type || `Вариант ${index + 1}`;
  const total_price = raw.total_price ?? raw.grand_total ?? 0;
  const currency = raw.currency || Currency.RUB;
  const destination = raw.destination || "";
  const description = raw.description || "";

  // Normalize flights
  let flights: Flight[] = [];
  if (Array.isArray(raw.flights) && raw.flights.length > 0) {
    flights = raw.flights;
  } else if (raw.flight) {
    flights = [
      {
        origin: raw.origin || "Москва",
        destination,
        departure_at: raw.departure_date || "",
        arrival_at: raw.departure_date || "",
        carrier: raw.flight.airline || raw.flight.carrier || "Авиакомпания",
        stops: raw.flight.transfers ?? 0,
        price: raw.flight.price_total ?? raw.flight.price_per_person ?? null,
        currency,
      },
    ];
  }

  // Normalize hotels
  let hotels: Hotel[] = [];
  if (Array.isArray(raw.hotels) && raw.hotels.length > 0) {
    hotels = raw.hotels;
  } else if (raw.hotel) {
    hotels = [
      {
        hotel: raw.hotel.name || "Отель",
        city: destination,
        check_in: raw.departure_date || "",
        check_out: raw.return_date || "",
        price: raw.hotel.price_total ?? null,
        currency,
        rating: raw.hotel.rating ?? (raw.hotel.stars ? raw.hotel.stars * 1.8 : 8.5),
        amenities: ["Wi-Fi", "Кондиционер"],
        image_url: raw.hotel.image_url || null,
      },
    ];
  }

  const flights_total = raw.budget?.flights_total ?? raw.flight?.price_total ?? null;
  const hotels_total = raw.budget?.hotels_total ?? raw.hotel?.price_total ?? null;

  return {
    ...raw,
    id,
    title,
    description,
    destination,
    total_price,
    currency,
    flights,
    hotels,
    budget: {
      flights_total,
      hotels_total,
      total: total_price,
      currency,
    },
  };
}

/**
 * Нормализует массив опций поездки.
 */
export function normalizeTripOptions(options: any[]): TripOption[] {
  if (!Array.isArray(options)) return [];
  return options.map((opt, idx) => normalizeTripOption(opt, idx));
}

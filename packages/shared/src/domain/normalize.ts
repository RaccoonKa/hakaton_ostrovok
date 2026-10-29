import { TripOption, Flight, Hotel, Transport } from "./types";
import { Currency, TransportType } from "./constants";

/**
 * Нормализует сырой объект тура от бэкенда (как из mock_dataset / packaging,
 * так и канонический объект TripOption) к единому стандарту UI,
 * включая транзитные стыковки авиаперелётов и ж/д поездов.
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
    flights = raw.flights.map((f: any) => ({
      ...f,
      stops: f.stops ?? (f.transfers ? f.transfers.length : 0),
      transit_point: f.transit_point ?? (f.transfers?.[0]?.city || null),
      layover_duration: f.layover_duration ?? (f.transfers?.[0]?.layover_duration || null),
    }));
  } else if (raw.flight) {
    flights = [
      {
        origin: raw.origin || "Москва",
        destination,
        departure_at: raw.departure_date || "",
        arrival_at: raw.departure_date || "",
        carrier: raw.flight.airline || raw.flight.carrier || "Авиакомпания",
        flight_number: raw.flight.flight_number || raw.flight.id || null,
        stops: raw.flight.stops ?? raw.flight.transfers ?? 0,
        transit_point: raw.flight.transit_point ?? null,
        layover_duration: raw.flight.layover_duration ?? null,
        price: raw.flight.price_total ?? raw.flight.price_per_person ?? null,
        currency,
        baggage: raw.flight.baggage || "Багаж 20 кг включён",
      },
    ];
  } else if (
    raw.transport &&
    (raw.transport.type === "Рейс" ||
      raw.transport.type?.toLowerCase().includes("рейс") ||
      raw.transport.type === "flight")
  ) {
    flights = [
      {
        origin: raw.origin || "Москва",
        destination,
        departure_at: raw.departure_date || "",
        arrival_at: raw.departure_date || "",
        carrier: raw.transport.carrier || "Авиакомпания",
        flight_number: raw.transport.id || null,
        stops: raw.transport.stops ?? raw.transport.transfers ?? 0,
        transit_point: raw.transport.transit_point ?? null,
        layover_duration: raw.transport.layover_duration ?? null,
        price: raw.transport.price_total ?? raw.transport.price_per_person ?? null,
        currency,
        baggage: raw.transport.baggage ?? "Багаж 20 кг включён",
      },
    ];
  }

  // Normalize transports (trains, buses, etc.)
  let transports: Transport[] = [];
  if (Array.isArray(raw.transports) && raw.transports.length > 0) {
    transports = raw.transports;
  } else if (Array.isArray(raw.transport) && raw.transport.length > 0) {
    transports = raw.transport;
  } else if (
    raw.transport &&
    (raw.transport.type === "Поезд" ||
      raw.transport.type?.toLowerCase().includes("поезд") ||
      raw.transport.type === "train")
  ) {
    transports = [
      {
        origin: raw.origin || "Москва",
        destination,
        departure_at: raw.departure_date || "",
        arrival_at: raw.departure_date || "",
        carrier: raw.transport.carrier || "Поезд РЖД",
        transport_type: TransportType.TRAIN,
        stops: raw.transport.stops ?? 0,
        transit_point: raw.transport.transit_point ?? null,
        layover_duration: raw.transport.layover_duration ?? null,
        price: raw.transport.price_total ?? raw.transport.price_per_person ?? null,
        currency,
        conditions: raw.transport.baggage ? `Багаж: ${raw.transport.baggage}` : undefined,
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
  const transport_total =
    raw.budget?.transport_total ??
    (transports.length > 0 ? transports[0].price : null);
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
    transports,
    transport: transports,
    hotels,
    budget: {
      flights_total,
      transport_total,
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

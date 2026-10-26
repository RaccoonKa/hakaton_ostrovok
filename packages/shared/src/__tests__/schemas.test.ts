import test from "node:test";
import assert from "node:assert/strict";
import {
  flightSchema,
  hotelSchema,
  tripOptionSchema,
  userRequestSchema,
} from "../domain/schemas";
import { MOCK_TRIP_OPTIONS } from "../mocks/travel-options";

test("flightSchema validates valid flight data", () => {
  const flight = {
    origin: "Москва (VKO)",
    destination: "Анталья (AYT)",
    departure_at: "2026-07-01T10:30:00+03:00",
    arrival_at: "2026-07-01T14:45:00+03:00",
    price: 48000,
    stops: 0,
  };
  const parsed = flightSchema.parse(flight);
  assert.equal(parsed.origin, "Москва (VKO)");
  assert.equal(parsed.stops, 0);
});

test("hotelSchema validates hotel data", () => {
  const hotel = {
    hotel: "Rixos Downtown 5★",
    city: "Анталья",
    check_in: "2026-07-01",
    check_out: "2026-07-08",
    rating: 4.9,
    price: 86800,
  };
  const parsed = hotelSchema.parse(hotel);
  assert.equal(parsed.rating, 4.9);
  assert.equal(parsed.guests, 1);
});

test("tripOptionSchema validates all MOCK_TRIP_OPTIONS", () => {
  for (const option of MOCK_TRIP_OPTIONS) {
    const parsed = tripOptionSchema.parse(option);
    assert.equal(parsed.isDemo, true);
    assert.ok((parsed.total_price ?? 0) > 0);
  }
});

test("userRequestSchema parses default request values", () => {
  const req = userRequestSchema.parse({
    origin: "Москва",
    destination: "Сочи",
  });
  assert.equal(req.travelers, 1);
  assert.deepEqual(req.preferences, []);
});

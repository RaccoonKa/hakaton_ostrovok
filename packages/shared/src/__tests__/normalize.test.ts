import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTripOption, normalizeTripOptions } from "../domain/normalize";
import { Currency } from "../domain/constants";

test("normalizeTripOption converts packaging aggregator format to canonical TripOption", () => {
  const rawPackage = {
    package_type: "Оптимальный",
    destination: "Сочи",
    description: "Удобный рейс Аэрофлот и хороший отель рядом с центром.",
    departure_date: "2026-11-10",
    return_date: "2026-11-17",
    passengers: 2,
    nights: 7,
    flight: {
      offer_id: "fl-123",
      airline: "Аэрофлот",
      transfers: 0,
      price_per_person: 15000,
      price_total: 30000,
    },
    hotel: {
      hotel_id: "ht-456",
      name: "Radisson Blu Resort",
      stars: 5,
      rating: 9.1,
      location: "Имеретинский курорт",
      price_total: 70000,
      image_url: "https://example.com/hotel.jpg",
    },
    grand_total: 100000,
    currency: "RUB",
  };

  const normalized = normalizeTripOption(rawPackage, 0);

  assert.equal(normalized.id, "opt-1-Оптимальный");
  assert.equal(normalized.title, "Оптимальный");
  assert.equal(normalized.destination, "Сочи");
  assert.equal(normalized.total_price, 100000);
  assert.equal(normalized.currency, Currency.RUB);

  // Flights normalized to array
  assert.equal(normalized.flights?.length, 1);
  assert.equal(normalized.flights?.[0].carrier, "Аэрофлот");
  assert.equal(normalized.flights?.[0].stops, 0);
  assert.equal(normalized.flights?.[0].price, 30000);

  // Hotels normalized to array
  assert.equal(normalized.hotels?.length, 1);
  assert.equal(normalized.hotels?.[0].hotel, "Radisson Blu Resort");
  assert.equal(normalized.hotels?.[0].rating, 9.1);
  assert.equal(normalized.hotels?.[0].image_url, "https://example.com/hotel.jpg");
  assert.equal(normalized.hotels?.[0].price, 70000);

  // Budget breakdown populated
  assert.equal(normalized.budget?.flights_total, 30000);
  assert.equal(normalized.budget?.hotels_total, 70000);
  assert.equal(normalized.budget?.total, 100000);
});

test("normalizeTripOption preserves already canonical TripOption", () => {
  const canonicalOption = {
    id: "canonical-1",
    title: "Комфортный отдых",
    destination: "Дубай",
    total_price: 180000,
    currency: Currency.RUB,
    flights: [
      {
        origin: "Москва",
        destination: "Дубай",
        departure_at: "2026-11-15",
        arrival_at: "2026-11-15",
        carrier: "Emirates",
        stops: 0,
        price: 90000,
      },
    ],
    hotels: [
      {
        hotel: "Atlantis The Palm",
        city: "Дубай",
        check_in: "2026-11-15",
        check_out: "2026-11-22",
        price: 90000,
        rating: 9.5,
      },
    ],
  };

  const normalized = normalizeTripOption(canonicalOption);

  assert.equal(normalized.id, "canonical-1");
  assert.equal(normalized.title, "Комфортный отдых");
  assert.equal(normalized.total_price, 180000);
  assert.equal(normalized.flights?.[0].carrier, "Emirates");
  assert.equal(normalized.hotels?.[0].hotel, "Atlantis The Palm");
});

test("normalizeTripOptions handles null, empty array, or malformed list gracefully", () => {
  assert.deepEqual(normalizeTripOptions([]), []);
  assert.deepEqual(normalizeTripOptions(null as any), []);

  const results = normalizeTripOptions([null, { package_type: "Эконом", grand_total: 50000 }]);
  assert.equal(results.length, 2);
  assert.equal(results[0].title, "Вариант 1");
  assert.equal(results[1].title, "Эконом");
  assert.equal(results[1].total_price, 50000);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  formatPrice,
  formatDateRange,
  formatDuration,
  formatNights,
  formatTransportType,
  formatMealPlan,
} from "../formatters/travel";
import { Currency, TransportType, MealPlan } from "../domain/constants";

test("formatPrice formats RUB correctly with non-breaking space", () => {
  const formatted = formatPrice(45200, Currency.RUB);
  assert.equal(formatted, "45\u00A0200\u00A0₽");
});

test("formatPrice formats other currencies", () => {
  assert.equal(formatPrice(1200, Currency.USD), "$1\u00A0200");
  assert.equal(formatPrice(500, Currency.EUR), "€500");
  assert.equal(formatPrice(null), "цена уточняется");
});

test("formatDateRange formats dates within the same month", () => {
  const result = formatDateRange("2026-07-01", "2026-07-08");
  assert.equal(result, "1–8\u00A0июля");
});

test("formatDuration parses ISO-8601 strings and minutes", () => {
  assert.equal(formatDuration("PT4H15M"), "4\u00A0ч 15\u00A0мин");
  assert.equal(formatDuration("PT40M"), "40\u00A0мин");
  assert.equal(formatDuration(90), "1\u00A0ч 30\u00A0мин");
});

test("formatNights handles Russian pluralization", () => {
  assert.equal(formatNights(1), "1 ночь");
  assert.equal(formatNights(3), "3 ночи");
  assert.equal(formatNights(7), "7 ночей");
  assert.equal(formatNights(21), "21 ночь");
});

test("formatTransportType and formatMealPlan translate correctly", () => {
  assert.equal(formatTransportType(TransportType.PLANE), "Самолёт");
  assert.equal(formatMealPlan(MealPlan.ALL_INCLUSIVE), "Всё включено");
});

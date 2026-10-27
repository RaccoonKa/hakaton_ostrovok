import test from "node:test";
import assert from "node:assert/strict";
import { MOCK_TRIP_OPTIONS, formatPrice } from "@corvax/shared";

// Helper functions matching filter formatting logic
function formatGuestsText(adults: number, children: number): string {
  const parts: string[] = [];
  if (adults > 0) {
    parts.push(`${adults} ${adults === 1 ? "взрослый" : "взрослых"}`);
  }
  if (children > 0) {
    const childWord =
      children === 1
        ? "ребёнок"
        : children < 5
        ? "ребёнка"
        : "детей";
    parts.push(`${children} ${childWord}`);
  }
  return parts.join(", ");
}

function formatBudgetRangeText(min: number, max: number, minLimit = 20000, maxLimit = 1000000): string {
  if (min > minLimit && max < maxLimit) {
    return `Бюджет: от ${min.toLocaleString("ru-RU")} до ${max.toLocaleString("ru-RU")} ₽`;
  } else if (max < maxLimit) {
    return `Бюджет: до ${max.toLocaleString("ru-RU")} ₽`;
  } else if (min > minLimit) {
    return `Бюджет: от ${min.toLocaleString("ru-RU")} ₽`;
  }
  return "Любой бюджет";
}

test("formatGuestsText correctly pluralizes adults and children", () => {
  assert.equal(formatGuestsText(1, 0), "1 взрослый");
  assert.equal(formatGuestsText(2, 0), "2 взрослых");
  assert.equal(formatGuestsText(2, 1), "2 взрослых, 1 ребёнок");
  assert.equal(formatGuestsText(2, 2), "2 взрослых, 2 ребёнка");
  assert.equal(formatGuestsText(2, 5), "2 взрослых, 5 детей");
});

test("formatBudgetRangeText formats ranges and limits correctly", () => {
  assert.equal(
    formatBudgetRangeText(50000, 150000),
    "Бюджет: от 50\u00A0000 до 150\u00A0000 ₽"
  );
  assert.equal(
    formatBudgetRangeText(20000, 100000),
    "Бюджет: до 100\u00A0000 ₽"
  );
  assert.equal(
    formatBudgetRangeText(80000, 1000000),
    "Бюджет: от 80\u00A0000 ₽"
  );
  assert.equal(
    formatBudgetRangeText(20000, 1000000),
    "Любой бюджет"
  );
});

test("MOCK_TRIP_OPTIONS contains valid trip data for Web UI rendering", () => {
  assert.ok(MOCK_TRIP_OPTIONS.length > 0);
  const firstOption = MOCK_TRIP_OPTIONS[0];

  assert.ok(firstOption.id);
  assert.ok(firstOption.destination);
  assert.ok((firstOption.total_price ?? 0) > 0);
  assert.ok(Array.isArray(firstOption.flights) && firstOption.flights.length > 0);
  assert.ok(Array.isArray(firstOption.hotels) && firstOption.hotels.length > 0);

  const formattedPrice = formatPrice(firstOption.total_price ?? 0);
  assert.ok(formattedPrice.includes("₽"));
});

test("Trip option hotels have required amenities and ratings", () => {
  for (const option of MOCK_TRIP_OPTIONS) {
    if (!option.hotels) continue;
    for (const h of option.hotels) {
      assert.ok(h.hotel, "Hotel name should be defined");
      if (h.rating !== undefined && h.rating !== null) {
        assert.ok(h.rating >= 0 && h.rating <= 10, "Rating should be between 0 and 10");
      }
      assert.ok(Array.isArray(h.amenities), "Amenities should be an array");
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  formatGuestsCount,
  buildFilterPrompt,
  ORIGIN_CITIES,
  DESTINATION_DIRECTIONS,
  DURATION_OPTIONS,
  BUDGET_OPTIONS,
  MEAL_OPTIONS,
  DEFAULT_CLARIFICATION_CHIPS,
} from "../utils/filters";

test("formatGuestsCount produces correct Russian plural forms", () => {
  assert.equal(formatGuestsCount(1, 0), "1 взрослый");
  assert.equal(formatGuestsCount(2, 0), "2 взрослых");
  assert.equal(formatGuestsCount(5, 0), "5 взрослых");
  assert.equal(formatGuestsCount(2, 1), "2 взрослых, 1 ребёнок");
  assert.equal(formatGuestsCount(2, 2), "2 взрослых, 2 ребёнка");
  assert.equal(formatGuestsCount(2, 5), "2 взрослых, 5 детей");
});

test("buildFilterPrompt generates expected prompt with all parameters", () => {
  const prompt = buildFilterPrompt({
    originCity: "Москва",
    destination: "Турция",
    directFlightsOnly: true,
    duration: "7",
    budget: "200000",
    mealPlan: "all_inclusive",
    adults: 2,
    children: 1,
  });

  assert.ok(prompt.startsWith("Уточнить параметры:"));
  assert.ok(prompt.includes("вылет из Москва"));
  assert.ok(prompt.includes("направление: Турция"));
  assert.ok(prompt.includes("только прямой рейс"));
  assert.ok(prompt.includes("всё включено"));
  assert.ok(prompt.includes("7 ночей"));
  assert.ok(prompt.includes("бюджет до 200\u00A0000 ₽"));
  assert.ok(prompt.includes("2 взрослых, 1 ребёнок"));
});

test("buildFilterPrompt handles minimal and optional parameters safely", () => {
  const prompt = buildFilterPrompt({
    originCity: "",
    destination: "",
    directFlightsOnly: false,
    duration: "",
    budget: "",
    mealPlan: "any",
    adults: 1,
    children: 0,
  });

  assert.equal(
    prompt,
    "Уточнить параметры: возможны пересадки, 1 взрослый"
  );
});

test("buildFilterPrompt formats explicit calendar dates and nights count", () => {
  const startDate = new Date(2026, 9, 15);
  const endDate = new Date(2026, 9, 22);
  const prompt = buildFilterPrompt({
    originCity: "Москва",
    destination: "Сочи",
    directFlightsOnly: true,
    duration: "7",
    budget: "180000",
    mealPlan: "all_inclusive",
    adults: 2,
    children: 0,
    startDate,
    endDate,
  });

  assert.ok(prompt.includes("даты: с 15 октября по 22 октября (7 ноч.)"));
  assert.ok(prompt.includes("бюджет до 180\u00A0000 ₽"));
  assert.ok(prompt.includes("2 взрослых"));
});

test("constants and clarification chips are well-formed and non-empty", () => {
  assert.ok(ORIGIN_CITIES.length >= 5);
  assert.ok(DESTINATION_DIRECTIONS.length >= 5);
  assert.ok(DURATION_OPTIONS.length >= 4);
  assert.ok(BUDGET_OPTIONS.length >= 4);
  assert.ok(MEAL_OPTIONS.length >= 4);

  assert.equal(DEFAULT_CLARIFICATION_CHIPS.length, 3);
  assert.ok(DEFAULT_CLARIFICATION_CHIPS.some((c) => c.includes("All Inclusive")));
});

test("formatFilterQuery matches Web SearchFiltersPopover output format exactly", () => {
  const { formatFilterQuery } = require("@corvax/shared");
  const startDate = new Date(2026, 9, 15);
  const endDate = new Date(2026, 9, 22);

  const query = formatFilterQuery({
    startDate,
    endDate,
    minBudget: 40000,
    maxBudget: 180000,
    adults: 2,
    children: 1,
  });

  assert.ok(query.includes("даты: с 15 октября по 22 октября (7 ноч.)"));
  assert.ok(/бюджет от 40[\s\u00A0\u202F]000 до 180[\s\u00A0\u202F]000 руб/.test(query));
  assert.ok(query.includes("2 взрослых, 1 ребёнок"));
});

export const ORIGIN_CITIES = [
  { label: "Любой", val: "" },
  { label: "Москва (MOW)", val: "Москва" },
  { label: "Санкт-Петербург (LED)", val: "Санкт-Петербург" },
  { label: "Казань (KZN)", val: "Казань" },
  { label: "Сочи (AER)", val: "Сочи" },
  { label: "Екатеринбург (SVX)", val: "Екатеринбург" },
];

export const DESTINATION_DIRECTIONS = [
  { label: "Любое направление", val: "" },
  { label: "Турция", val: "Турция" },
  { label: "ОАЭ", val: "ОАЭ" },
  { label: "Египет", val: "Египет" },
  { label: "Сочи", val: "Сочи" },
  { label: "Таиланд", val: "Таиланд" },
];

export const DURATION_OPTIONS = [
  { label: "3–4 ночи", val: "3-4" },
  { label: "7 ночей", val: "7" },
  { label: "10–14 ночей", val: "10-14" },
  { label: "Любая", val: "" },
];

export const BUDGET_OPTIONS = [
  { label: "до 150 тыс. ₽", val: "150000" },
  { label: "до 200 тыс. ₽", val: "200000" },
  { label: "до 300 тыс. ₽", val: "300000" },
  { label: "до 500 тыс. ₽", val: "500000" },
  { label: "Любой", val: "" },
];

export const MEAL_OPTIONS = [
  { label: "Всё включено (All Inc)", val: "all_inclusive" },
  { label: "Завтрак + ужин (HB)", val: "half_board" },
  { label: "Только завтраки (BB)", val: "breakfast" },
  { label: "Любое", val: "any" },
];

export const DEFAULT_CLARIFICATION_CHIPS = [
  "Важен пологий песчаный вход и All Inclusive",
  "Достаточно завтраков, главное короткий трансфер",
  "Напишу своими словами...",
];

export function formatGuestsCount(adults: number, children: number): string {
  const parts: string[] = [];
  if (adults > 0) {
    parts.push(`${adults} ${adults === 1 ? "взрослый" : "взрослых"}`);
  }
  if (children > 0) {
    parts.push(
      `${children} ${
        children === 1 ? "ребёнок" : children < 5 ? "ребёнка" : "детей"
      }`
    );
  }
  return parts.join(", ");
}

export function buildFilterPrompt({
  originCity,
  destination,
  directFlightsOnly,
  duration,
  budget,
  mealPlan,
  adults,
  children,
}: {
  originCity: string;
  destination: string;
  directFlightsOnly: boolean;
  duration: string;
  budget: string;
  mealPlan: string;
  adults: number;
  children: number;
}): string {
  const parts: string[] = [];

  if (originCity) {
    parts.push(`вылет из ${originCity}`);
  }
  if (destination) {
    parts.push(`направление: ${destination}`);
  }

  const flightText = directFlightsOnly ? "только прямой рейс" : "возможны пересадки";
  parts.push(flightText);

  if (mealPlan && mealPlan !== "any") {
    const mealText =
      mealPlan === "all_inclusive"
        ? "всё включено"
        : mealPlan === "half_board"
        ? "завтрак и ужин"
        : "только завтраки";
    parts.push(mealText);
  }

  if (duration) {
    parts.push(`${duration} ночей`);
  }

  if (budget) {
    parts.push(`бюджет до ${Number(budget).toLocaleString("ru-RU")} ₽`);
  }

  const guestsText = formatGuestsCount(adults, children);
  if (guestsText) {
    parts.push(guestsText);
  }

  return `Уточнить параметры: ${parts.join(", ")}`;
}

/**
 * Unified Filter Parameters and Query Generator
 * Ensures that both Web and Mobile construct filter prompts identically,
 * adhering to the grammar and extraction regexes of the backend agent (`extraction.py`).
 */

export interface TravelFilterParams {
  originCity?: string;
  destination?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  durationNights?: number | string | null;
  minBudget?: number | null;
  maxBudget?: number | null;
  adults?: number;
  children?: number;
  directFlightsOnly?: boolean;
  mealPlan?: string | null;
  hotelTags?: string[];
}

export function formatGuestsCount(adults: number = 1, children: number = 0): string {
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

const RU_MONTH_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"
];

function formatDateRussian(d: Date): string {
  return `${d.getDate()} ${RU_MONTH_GENITIVE[d.getMonth()]}${d.getFullYear() > new Date().getFullYear() ? ` ${d.getFullYear()}` : ""}`;
}

export function formatFilterQuery(params: TravelFilterParams): string {
  const parts: string[] = [];

  // Origin
  const origin = params.originCity?.trim();
  if (origin && origin !== "Любой") {
    parts.push(`вылет из ${origin}`);
  }

  // Destination
  const dest = params.destination?.trim();
  if (dest && dest !== "Любое направление") {
    parts.push(`направление: ${dest}`);
  }

  // Dates or Duration
  if (params.startDate) {
    const sDate = params.startDate instanceof Date ? params.startDate : new Date(params.startDate);
    if (params.endDate) {
      const eDate = params.endDate instanceof Date ? params.endDate : new Date(params.endDate);
      if (sDate.getTime() !== eDate.getTime()) {
        const diffDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
        parts.push(`даты: с ${formatDateRussian(sDate)} по ${formatDateRussian(eDate)} (${diffDays} ноч.)`);
      } else {
        parts.push(`даты: с ${formatDateRussian(sDate)}`);
      }
    } else {
      parts.push(`даты: с ${formatDateRussian(sDate)}`);
    }
  } else if (params.durationNights) {
    parts.push(`на ${params.durationNights} ночей`);
  }

  // Budget
  const minB = params.minBudget;
  const maxB = params.maxBudget;
  if (minB && maxB && minB > 20000 && maxB < 1000000) {
    parts.push(`бюджет от ${minB.toLocaleString("ru-RU")} до ${maxB.toLocaleString("ru-RU")} руб`);
  } else if (maxB && maxB < 1000000) {
    parts.push(`бюджет до ${maxB.toLocaleString("ru-RU")} руб`);
  } else if (minB && minB > 20000) {
    parts.push(`бюджет от ${minB.toLocaleString("ru-RU")} руб`);
  }

  // Guests
  const adults = params.adults ?? 2;
  const children = params.children ?? 0;
  parts.push(formatGuestsCount(adults, children));

  // Flights
  if (params.directFlightsOnly) {
    parts.push("только прямой рейс");
  }

  // Meals
  if (params.mealPlan && params.mealPlan !== "any") {
    const mealMap: Record<string, string> = {
      all_inclusive: "всё включено",
      half_board: "завтрак и ужин",
      breakfast: "только завтраки",
    };
    parts.push(mealMap[params.mealPlan] || params.mealPlan);
  }

  // Tags
  if (params.hotelTags && params.hotelTags.length > 0) {
    parts.push(params.hotelTags.join(", "));
  }

  return parts.join(", ");
}

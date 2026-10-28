import { Currency, MealPlan, TransportType } from "../domain/constants";

/**
 * Форматирует цену в заданной валюте.
 * Для RUB используется официальный знак ₽ с неразрывным пробелом (\u00A0).
 * Пример: formatPrice(45200, Currency.RUB) -> "45 200 ₽"
 */
export function formatPrice(
  amount: number | null | undefined,
  currency: Currency | string | null | undefined = Currency.RUB
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "цена уточняется";
  }

  const effectiveCurrency = currency ?? Currency.RUB;

  // Разделение тысяч пробелом
  const rounded = Math.round(amount);
  const formattedNumber = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");

  switch (effectiveCurrency) {
    case Currency.RUB:
    case "RUB":
      return `${formattedNumber}\u00A0₽`;
    case Currency.USD:
    case "USD":
      return `$${formattedNumber}`;
    case Currency.EUR:
    case "EUR":
      return `€${formattedNumber}`;
    case Currency.TRY:
    case "TRY":
      return `${formattedNumber}\u00A0₺`;
    case Currency.AED:
    case "AED":
      return `${formattedNumber}\u00A0AED`;
    case Currency.THB:
    case "THB":
      return `${formattedNumber}\u00A0฿`;
    case Currency.CNY:
    case "CNY":
      return `¥${formattedNumber}`;
    default:
      return `${formattedNumber}\u00A0${currency}`;
  }
}

const RU_MONTHS_SHORT = [
  "янв.",
  "февр.",
  "марта",
  "апр.",
  "мая",
  "июня",
  "июля",
  "авг.",
  "сент.",
  "окт.",
  "нояб.",
  "дек.",
];

/**
 * Форматирует диапазон дат в русском туристическом стандарте через тире (en-dash).
 * Пример: formatDateRange("2026-07-01", "2026-07-08") -> "1–8 июля"
 * Пример: formatDateRange("2026-06-28", "2026-07-05") -> "28 июня – 5 июля"
 */
export function formatDateRange(
  startInput: string | Date | null | undefined,
  endInput: string | Date | null | undefined
): string {
  if (!startInput) return "даты не указаны";

  const start = typeof startInput === "string" ? new Date(startInput) : startInput;
  if (isNaN(start.getTime())) return "даты не указаны";

  const startDay = start.getDate();
  const startMonth = RU_MONTHS_SHORT[start.getMonth()];

  if (!endInput) {
    return `${startDay}\u00A0${startMonth}`;
  }

  const end = typeof endInput === "string" ? new Date(endInput) : endInput;
  if (isNaN(end.getTime())) {
    return `${startDay}\u00A0${startMonth}`;
  }

  const endDay = end.getDate();
  const endMonth = RU_MONTHS_SHORT[end.getMonth()];

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startDay}–${endDay}\u00A0${startMonth}`;
  }

  return `${startDay}\u00A0${startMonth} – ${endDay}\u00A0${endMonth}`;
}

/**
 * Форматирует количество ночей.
 * Пример: formatNights(7) -> "7 ночей"
 */
export function formatNights(nights: number | null | undefined): string {
  if (nights === null || nights === undefined) return "";
  const mod10 = nights % 10;
  const mod100 = nights % 100;

  if (mod100 >= 11 && mod100 <= 14) {
    return `${nights} ночей`;
  }
  if (mod10 === 1) {
    return `${nights} ночь`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${nights} ночи`;
  }
  return `${nights} ночей`;
}

/**
 * Парсит ISO-8601 длительность (например, "PT4H15M" или "PT45M") или минуты в человекочитаемый вид.
 * Пример: formatDuration("PT4H15M") -> "4 ч 15 мин"
 */
export function formatDuration(duration: string | number | null | undefined): string {
  if (duration === null || duration === undefined) return "";

  if (typeof duration === "number") {
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;
    if (hours > 0 && mins > 0) return `${hours}\u00A0ч ${mins}\u00A0мин`;
    if (hours > 0) return `${hours}\u00A0ч`;
    return `${mins}\u00A0мин`;
  }

  // ISO 8601 string parsing (e.g. PT4H15M)
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
  const match = duration.match(regex);
  if (match) {
    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const mins = match[2] ? parseInt(match[2], 10) : 0;
    if (hours > 0 && mins > 0) return `${hours}\u00A0ч ${mins}\u00A0мин`;
    if (hours > 0) return `${hours}\u00A0ч`;
    if (mins > 0) return `${mins}\u00A0мин`;
  }

  return duration;
}

/**
 * Название типа транспорта на русском языке.
 */
export function formatTransportType(type: TransportType | string | null | undefined): string {
  switch (type) {
    case TransportType.PLANE:
      return "Самолёт";
    case TransportType.TRAIN:
      return "Поезд";
    case TransportType.BUS:
      return "Автобус";
    case TransportType.CAR:
      return "Автомобиль";
    case TransportType.FERRY:
      return "Паром";
    case TransportType.TAXI:
      return "Такси";
    case TransportType.SHUTTLE:
      return "Шаттл";
    default:
      return "Транспорт";
  }
}

/**
 * Название типа питания на русском языке.
 */
export function formatMealPlan(plan: MealPlan | string | null | undefined): string {
  switch (plan) {
    case MealPlan.ALL_INCLUSIVE:
      return "Всё включено";
    case MealPlan.FULL_BOARD:
      return "Полный пансион (3-разовое)";
    case MealPlan.HALF_BOARD:
      return "Полупансион (завтрак + ужин)";
    case MealPlan.BREAKFAST:
      return "Завтрак включён";
    case MealPlan.ROOM_ONLY:
      return "Без питания";
    default:
      return "";
  }
}


/**
 * Форматирует временную метку сообщения в человекочитаемый вид HH:MM (например, "18:42").
 * Защищает от вывода сырых ISO-строк с датой и миллисекундами.
 */
export function formatDisplayTime(raw?: string | null): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) return trimmed;
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
    }
  } catch {
    // fallback
  }
  return "";
}

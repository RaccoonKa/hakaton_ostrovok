export const DESIGN_TOKENS = {
  colors: {
    primary: {
      DEFAULT: "#B286D0",
      hover: "#9C68C1",
      active: "#8D57B4",
      light: "#F8F2FC",
      tint: "#F4EBF9",
    },
    secondary: {
      DEFAULT: "#FF7A30",
      hover: "#E86922",
      light: "#FFF4EE",
    },
    tertiary: {
      DEFAULT: "#22C55E",
      hover: "#16A34A",
      light: "#ECFDF5",
      bg: "#DCFCE7",
    },
    canvas: "#FBFBFD",
    surface: {
      DEFAULT: "#FFFFFF",
      muted: "#F4F4F6",
      subtle: "#EEEEF2",
      border: "#E5E5EB",
      borderSubtle: "#F3F4F6",
    },
    content: {
      primary: "#18181B",
      secondary: "#3F3F46",
      muted: "#71717A",
      tertiary: "#9CA3AF",
    },
  },
  borderRadius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
    full: "9999px",
  },
} as const;

export const SHARED_SUGGESTIONS = [
  "Хочу в Сочи на неделю в июле, 2 взрослых, бюджет до 100 000 ₽",
  "Тёплое море в ноябре с ребёнком до 200 000 ₽",
  "Подбери тур в Анталью с отелем 5★ и первой линией",
  "Горные лыжи в Сочи на двоих в январе",
  "Выходные в Стамбуле: отель возле достопримечательностей",
] as const;

export const SHARED_QUICK_CHIPS = [
  "🏨 Показать отели в ОАЭ",
  "✈️ Только прямые рейсы",
  "⚖️ Сравнить отели",
  "📅 А если на 2 дня позже?",
] as const;

export const PAYMENT_SIMULATION = {
  orderPrefix: "OST-2026-",
  methods: [
    { id: "sbp", label: "СБП (0 ₽ тест)", icon: "⚡️" },
    { id: "card", label: "Карта (тест)", icon: "💳" },
    { id: "hotel", label: "В отеле", icon: "🏨" },
  ],
  disclaimer:
    "В рамках демонстрации списание реальных средств не производится. Эмулируется моментальная авторизация через Ostrovok Travel Gateway.",
} as const;

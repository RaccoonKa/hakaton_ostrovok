import { DESIGN_TOKENS } from "@corvax/shared";

/**
 * Shared design tokens for "О!дин запрос" Mobile
 * Fully aligned with Web client (apps/web) & @corvax/shared
 */

const baseSpacing = {
  "2xs": 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 40,
  "3xl": 48,
};

const baseBorderRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
};

const baseShadowsLight = {
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

const baseShadowsDark = {
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const lightColors = {
  // Primary brand palette (Royal Deep Purple)
  primary: DESIGN_TOKENS.colors.primary.DEFAULT, // #581C87
  primaryContainer: DESIGN_TOKENS.colors.primary.hover, // #4C1675
  primaryDark: DESIGN_TOKENS.colors.primary.active, // #3B0764
  primaryHover: DESIGN_TOKENS.colors.primary.hover, // #4C1675
  primaryLight: DESIGN_TOKENS.colors.primary.light, // #FAF5FF
  accentPurpleTint: DESIGN_TOKENS.colors.primary.tint, // #F3E8FF
  headerBg: DESIGN_TOKENS.colors.primary.DEFAULT, // #581C87

  // Secondary (Ostrovok warm Orange) & Tertiary (Emerald Green)
  secondary: DESIGN_TOKENS.colors.secondary.DEFAULT, // #FF7A30
  secondaryHover: DESIGN_TOKENS.colors.secondary.hover, // #E86922
  secondaryLight: DESIGN_TOKENS.colors.secondary.light, // #FFF4EE
  tertiary: DESIGN_TOKENS.colors.tertiary.DEFAULT, // #22C55E
  tertiaryLight: DESIGN_TOKENS.colors.tertiary.light, // #ECFDF5
  tertiaryBg: DESIGN_TOKENS.colors.tertiary.bg, // #DCFCE7

  // Surfaces & Backgrounds
  background: DESIGN_TOKENS.colors.canvas, // #FBFBFD
  surface: DESIGN_TOKENS.colors.surface.DEFAULT, // #FFFFFF
  card: DESIGN_TOKENS.colors.surface.DEFAULT, // #FFFFFF
  surfaceContainerLow: "#F6F2F7",
  surfaceContainer: "#F0EDF1", // Exact web user bubble container
  surfaceContainerHigh: "#EAE7EB",
  canvasMuted: DESIGN_TOKENS.colors.surface.muted, // #F4F4F6
  canvasSubtle: DESIGN_TOKENS.colors.surface.subtle, // #EEEEF2

  // Borders
  border: DESIGN_TOKENS.colors.surface.border, // #E5E5EB
  borderSubtle: DESIGN_TOKENS.colors.surface.borderSubtle, // #F3F4F6
  borderStandard: DESIGN_TOKENS.colors.surface.border, // #E5E5EB

  // Typography
  textPrimary: DESIGN_TOKENS.colors.content.primary, // #18181B
  textSecondary: DESIGN_TOKENS.colors.content.secondary, // #3F3F46
  textTertiary: DESIGN_TOKENS.colors.content.tertiary, // #9CA3AF
  textMuted: DESIGN_TOKENS.colors.content.muted, // #71717A

  // Badges & Accents
  badgeRecommendBg: "#ECFDF5",
  badgeRecommendText: "#047857",
  star: "#F59E0B",
  hotelScoreBg: "#F0FDF4",
  hotelScoreText: "#166534",

  // Status
  success: "#22C55E",
  successBg: "#DCFCE7",
  warning: "#F59E0B",
  warningBg: "#FEF3C7",
  warningText: "#92400E",
  error: "#EF4444",
  errorBg: "#FEE2E2",
};

export const darkColors = {
  // Primary brand palette (adjusted for dark contrast)
  primary: "#C084FC", // Vibrant readable purple
  primaryContainer: "#7E22CE",
  primaryDark: "#581C87",
  primaryHover: "#A855F7",
  primaryLight: "#2E1065",
  accentPurpleTint: "#3B0764",
  headerBg: "#581C87", // Consistent Stitch Purple header

  // Secondary & Tertiary
  secondary: "#FF7A30",
  secondaryHover: "#E86922",
  secondaryLight: "#2A1810",
  tertiary: "#22C55E",
  tertiaryLight: "#064E3B",
  tertiaryBg: "#064E3B",

  // Surfaces & Backgrounds
  background: "#0F0E17",
  surface: "#181726",
  card: "#1E1D2E",
  surfaceContainerLow: "#141320",
  surfaceContainer: "#242236",
  surfaceContainerHigh: "#2E2A44",
  canvasMuted: "#181726",
  canvasSubtle: "#242236",

  // Borders
  border: "#2E2A44",
  borderSubtle: "#242236",
  borderStandard: "#2E2A44",

  // Typography
  textPrimary: "#F4F4F6",
  textSecondary: "#A1A1AA",
  textTertiary: "#71717A",
  textMuted: "#8E8E9A",

  // Badges & Accents
  badgeRecommendBg: "#064E3B",
  badgeRecommendText: "#6EE7B7",
  star: "#F59E0B",
  hotelScoreBg: "#064E3B",
  hotelScoreText: "#6EE7B7",

  // Status
  success: "#22C55E",
  successBg: "#064E3B",
  warning: "#F59E0B",
  warningBg: "#78350F",
  warningText: "#FCD34D",
  error: "#EF4444",
  errorBg: "#7F1D1D",
};

export const lightTheme = {
  isDark: false,
  colors: lightColors,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadowsLight,
};

export const darkTheme = {
  isDark: true,
  colors: darkColors,
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  shadows: baseShadowsDark,
};

let activeIsDark = false;

export function setAppTheme(isDark: boolean) {
  activeIsDark = isDark;
}

export const theme = {
  get isDark() {
    return activeIsDark;
  },
  colors: new Proxy(lightColors, {
    get(_target, prop: keyof typeof lightColors) {
      const activeColors = activeIsDark ? darkColors : lightColors;
      return activeColors[prop];
    },
  }),
  spacing: baseSpacing,
  borderRadius: baseBorderRadius,
  get shadows() {
    return activeIsDark ? baseShadowsDark : baseShadowsLight;
  },
};

export function getTheme(isDark: boolean) {
  return isDark ? darkTheme : lightTheme;
}

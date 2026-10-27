import { DESIGN_TOKENS } from "@corvax/shared";

/**
 * Shared design tokens for "О!дин запрос" Mobile
 * Fully aligned with Web client (apps/web) & @corvax/shared
 */
export const theme = {
  colors: {
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
  },
  spacing: {
    "2xs": 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    "2xl": 40,
    "3xl": 48,
  },
  borderRadius: {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 16,
    xl: 20,
    "2xl": 24,
    full: 9999,
  },
  shadows: {
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
  },
};

/**
 * Google Stitch "Calm Intelligence" design tokens for "О!дин запрос" Mobile
 */
export const theme = {
  colors: {
    // Primary & containers (Soft lavender/lilac #B286D0)
    primary: "#B286D0",
    primaryContainer: "#9C68C1",
    primaryHover: "#8D57B4",
    primaryLight: "#F8F2FC",
    accentPurpleTint: "#F4EBF9",

    // Secondary & Tertiary
    secondary: "#FF7A30",
    secondaryLight: "#FFF7ED",
    tertiary: "#22C55E",

    // Surfaces & Backgrounds
    background: "#FBFBFD",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    surfaceContainerLow: "#F9F5FC",
    surfaceContainer: "#F3EBF9",
    surfaceContainerHigh: "#ECE0F5",
    canvasMuted: "#F4F4F6",
    canvasSubtle: "#FAFAFA",

    // Borders
    border: "#E5E7EB",
    borderSubtle: "#F3F4F6",
    borderStandard: "#E5E7EB",

    // Typography
    textPrimary: "#18181B",
    textSecondary: "#4B5563",
    textTertiary: "#9CA3AF",
    textMuted: "#9CA3AF",

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
    xl: 24,
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

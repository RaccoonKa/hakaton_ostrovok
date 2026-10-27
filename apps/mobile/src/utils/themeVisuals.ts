/**
 * Dynamic theme visual resolution helpers for mobile components.
 * Pure TypeScript functions safe for both React Native and Node test runners.
 */

export interface SendButtonVisuals {
  backgroundColor: string;
  iconColor: string;
}

/**
 * Computes exact send button background and icon colors to prevent
 * dark artifacts or unreadable contrast in both light and dark modes.
 */
export function getSendButtonVisuals(
  isSendActive: boolean,
  isDark: boolean,
  surfaceContainer?: string,
  textMuted?: string,
): SendButtonVisuals {
  if (isSendActive) {
    return {
      // Vibrant royal purple (#7E22CE) in light mode, bright lavender (#A855F7) in dark mode
      backgroundColor: isDark ? "#A855F7" : "#7E22CE",
      iconColor: "#FFFFFF",
    };
  }

  return {
    // Clean soft gray (#E5E7EB) in light mode; muted dark surface (#242236) in dark mode
    backgroundColor: isDark ? (surfaceContainer || "#242236") : "#E5E7EB",
    iconColor: isDark ? (textMuted || "#8E8E9A") : "#9CA3AF",
  };
}

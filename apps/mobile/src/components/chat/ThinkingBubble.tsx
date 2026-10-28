import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { theme, getTheme } from "../../theme";
import { Icon, IconName } from "../common/Icon";

export interface ThinkingBubbleProps {
  statusText?: string;
  isThinking?: boolean;
  currentStep?: "analyzing_flights" | "finding_hotels" | "calculating_budget" | "ready" | string;
  isDark?: boolean;
}

export const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
  statusText,
  isThinking = true,
  currentStep = "analyzing_flights",
  isDark = false,
}) => {
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isThinking) return;

    const createPulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0.3,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, 600 - delay)),
        ])
      );

    const anim1 = createPulse(dot1, 0);
    const anim2 = createPulse(dot2, 150);
    const anim3 = createPulse(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [isThinking, dot1, dot2, dot3]);

  if (!isThinking) return null;

  let iconName: IconName = "sparkles";
  let title = "ИИ подбирает варианты";
  let subtitle = "Синтез информации о рейсах, отелях и тарифах";

  const stepLower = (currentStep || "").toLowerCase();
  const textLower = (statusText || "").toLowerCase();

  if (
    stepLower.includes("flight") ||
    textLower.includes("рейс") ||
    textLower.includes("перелет") ||
    textLower.includes("авиа")
  ) {
    iconName = "plane";
    title = "Анализирую авиарейсы";
    subtitle = "Поиск прямых вылетов с включённым багажом";
  } else if (
    stepLower.includes("hotel") ||
    textLower.includes("отел") ||
    textLower.includes("номер") ||
    textLower.includes("гостиниц")
  ) {
    iconName = "hotel";
    title = "Подбираю отели";
    subtitle = "Проверка доступности и спецтарифов";
  } else if (
    stepLower.includes("budget") ||
    textLower.includes("бюджет") ||
    textLower.includes("расчет") ||
    textLower.includes("оптимиз")
  ) {
    iconName = "sliders";
    title = "Рассчитываю бюджет";
    subtitle = "Поиск спецтарифов и окон пониженного спроса";
  } else if (statusText) {
    title = statusText;
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Left Phase Icon Badge */}
        <View style={styles.iconContainer}>
          <Icon name={iconName} size={15} color="#FFFFFF" />
        </View>

        {/* Right Info Column */}
        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {/* Animated 3-Dots wave right next to title — never pushed off to the right margin! */}
            <View style={styles.dotsRow}>
              <Animated.View
                style={[
                  styles.dot,
                  {
                    backgroundColor: colors.primary,
                    opacity: dot1,
                    transform: [{ scale: dot1.interpolate({ inputRange: [0.3, 1], outputRange: [0.85, 1.25] }) }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    backgroundColor: colors.primary,
                    opacity: dot2,
                    transform: [{ scale: dot2.interpolate({ inputRange: [0.3, 1], outputRange: [0.85, 1.25] }) }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.dot,
                  {
                    backgroundColor: colors.primary,
                    opacity: dot3,
                    transform: [{ scale: dot3.interpolate({ inputRange: [0.3, 1], outputRange: [0.85, 1.25] }) }],
                  },
                ]}
              />
            </View>
          </View>
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    width: "100%",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    maxWidth: "100%",
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.colors.primary, // #581C87
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    flexShrink: 1, // Truncates if line is very narrow rather than pushing dots off
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0, // Dots are rigidly anchored next to the title
  },
  dot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: theme.colors.primary, // #581C87
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});

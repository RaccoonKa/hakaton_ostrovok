import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { theme } from "../../theme";
import { Icon, IconName } from "../common/Icon";

export interface ThinkingBubbleProps {
  statusText?: string;
  isThinking?: boolean;
}

export const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
  statusText = "Анализирую авиарейсы, отели и логистику...",
  isThinking = true,
}) => {
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
          Animated.delay(Math.max(0, 700 - delay)),
        ])
      );

    const anim1 = createPulse(dot1, 0);
    const anim2 = createPulse(dot2, 200);
    const anim3 = createPulse(dot3, 400);

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
  let subtitle = "Синтез информации о рейсах, отелях и квотах";

  const lower = statusText.toLowerCase();
  if (lower.includes("рейс") || lower.includes("перелет") || lower.includes("авиа")) {
    iconName = "plane";
    subtitle = "Поиск прямых дневных рейсов с включённым багажом";
  } else if (lower.includes("отел") || lower.includes("номер") || lower.includes("гостиниц")) {
    iconName = "hotel";
    subtitle = "Проверка доступности и спецтарифов в официальной базе";
  } else if (lower.includes("бюджет") || lower.includes("расчет")) {
    iconName = "sliders";
    subtitle = "Расчет оптимального бюджета и сезонных скидок";
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Icon name={iconName} size={16} color="#FFFFFF" />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {statusText}
            </Text>
            <View style={styles.dotsRow}>
              <Animated.View style={[styles.dot, { opacity: dot1 }]} />
              <Animated.View style={[styles.dot, { opacity: dot2 }]} />
              <Animated.View style={[styles.dot, { opacity: dot3 }]} />
            </View>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: theme.spacing.xs,
    width: "100%",
    maxWidth: 420,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primary, // #581C87
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary, // #581C87
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});

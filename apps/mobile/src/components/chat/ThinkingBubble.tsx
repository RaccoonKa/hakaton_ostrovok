import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { theme } from "../../theme";

export interface ThinkingBubbleProps {
  statusText?: string;
  isThinking?: boolean;
}

export const ThinkingBubble: React.FC<ThinkingBubbleProps> = ({
  statusText = "Поиск: прямой рейс ≤ 5.5ч, t° воды ≥ +25°C, пологий берег",
  isThinking = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isThinking) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [isThinking, pulseAnim]);

  if (!isThinking) return null;

  return (
    <View style={styles.container}>
      <View style={styles.avatarBadge}>
        <Text style={styles.avatarLettermark}>О!</Text>
      </View>
      <View style={styles.bubble}>
        <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
        <Text style={styles.text} numberOfLines={2}>
          {statusText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  avatarBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.headerBg, // #581C87
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.sm,
  },
  avatarLettermark: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bubble: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadows.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary, // #581C87
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});

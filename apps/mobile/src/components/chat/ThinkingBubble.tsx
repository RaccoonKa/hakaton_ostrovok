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
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!isThinking) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 700,
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
      <View style={styles.avatarBubble}>
        <Text style={styles.avatarIcon}>✨</Text>
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
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIcon: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  bubble: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: undefined,
    lineHeight: 16,
  },
});

import React from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle, TextStyle } from "react-native";
import { theme } from "../../theme";

export interface DemoBadgeProps {
  label?: string;
  variant?: "warning" | "tint" | "subtle";
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  label = "Демо-режим",
  variant = "warning",
  style,
  textStyle,
}) => {
  return (
    <View style={[styles.badge, styles[variant], style]}>
      <Text style={[styles.icon, variant === "warning" ? styles.warningIcon : styles.tintIcon]}>
        ●
      </Text>
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    gap: 4,
  },
  warning: {
    backgroundColor: theme.colors.warningBg,
    borderColor: "#FDE68A",
  },
  tint: {
    backgroundColor: theme.colors.accentPurpleTint,
    borderColor: "#DAD7FF",
  },
  subtle: {
    backgroundColor: theme.colors.canvasMuted,
    borderColor: theme.colors.border,
  },
  icon: {
    fontSize: 7,
  },
  warningIcon: {
    color: theme.colors.warningText,
  },
  tintIcon: {
    color: theme.colors.primary,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
  warningText: {
    color: theme.colors.warningText,
  },
  tintText: {
    color: theme.colors.primary,
  },
  subtleText: {
    color: theme.colors.textSecondary,
  },
});

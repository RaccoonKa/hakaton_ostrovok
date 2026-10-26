import React from "react";
import { StyleSheet, Text, View, StyleProp, ViewStyle } from "react-native";
import { formatPrice, Currency } from "@corvax/shared";
import { theme } from "../../theme";

export interface PriceTagProps {
  amount?: number | null;
  currency?: Currency | string | null;
  subtitle?: string;
  savings?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  style?: StyleProp<ViewStyle>;
}

export const PriceTag: React.FC<PriceTagProps> = ({
  amount,
  currency = Currency.RUB,
  subtitle,
  savings,
  size = "md",
  align = "left",
  style,
}) => {
  const formatted = formatPrice(amount, currency);

  return (
    <View style={[styles.container, align === "right" && styles.alignRight, style]}>
      {savings && (
        <View style={styles.savingsPill}>
          <Text style={styles.savingsText}>{savings}</Text>
        </View>
      )}
      <View style={[styles.priceRow, align === "right" && styles.rowRight]}>
        <Text style={[styles.price, styles[`price_${size}`]]}>{formatted}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  alignRight: {
    alignItems: "flex-end",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  rowRight: {
    justifyContent: "flex-end",
  },
  price: {
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  price_sm: {
    fontSize: 14,
  },
  price_md: {
    fontSize: 17,
    letterSpacing: -0.3,
  },
  price_lg: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: "400",
  },
  savingsPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#15803D",
  },
});

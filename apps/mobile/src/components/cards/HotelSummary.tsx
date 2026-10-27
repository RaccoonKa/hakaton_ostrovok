import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Hotel,
  formatDateRange,
  formatMealPlan,
} from "@corvax/shared";
import { theme, getTheme } from "../../theme";
import { PriceTag } from "./PriceTag";
import { Icon } from "../common/Icon";

export interface HotelSummaryProps {
  hotel: Hotel;
  showPrice?: boolean;
  isDark?: boolean;
}

const HotelSummaryComponent: React.FC<HotelSummaryProps> = ({
  hotel,
  showPrice = false,
  isDark = false,
}) => {
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const dates = formatDateRange(hotel.check_in, hotel.check_out);
  const meal = hotel.meal_plan ? formatMealPlan(hotel.meal_plan) : "";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.hotelTitleRow}>
            <Icon name="hotel" size={15} color={colors.primary} />
            <Text
              style={[styles.hotelName, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {hotel.hotel}
            </Text>
          </View>
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>{hotel.city}</Text>
        </View>

        {hotel.rating ? (
          <View style={styles.ratingBadge}>
            <Icon name="star" size={11} color="#B45309" filled />
            <Text style={styles.ratingText}>{hotel.rating}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Icon name="calendar" size={12} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>{dates}</Text>
        </View>
        {meal ? (
          <View style={styles.infoItem}>
            <Text style={styles.dotSeparator}>•</Text>
            <Icon name="restaurant" size={12} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{meal}</Text>
          </View>
        ) : null}
      </View>

      {hotel.amenities && hotel.amenities.length > 0 && (
        <View style={styles.amenitiesRow}>
          {hotel.amenities.slice(0, 3).map((amenity, idx) => (
            <View
              key={idx}
              style={[
                styles.amenityTag,
                { backgroundColor: isDark ? colors.surfaceContainer : colors.surfaceContainerLow },
              ]}
            >
              <Text style={[styles.amenityText, { color: colors.textSecondary }]}>{amenity}</Text>
            </View>
          ))}
        </View>
      )}

      {showPrice && hotel.price ? (
        <View style={styles.priceRow}>
          <PriceTag
            amount={hotel.price}
            currency={hotel.currency}
            subtitle="за номер"
            size="sm"
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleCol: {
    flex: 1,
    marginRight: 6,
  },
  hotelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  hotelName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    flex: 1,
  },
  locationText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
    marginLeft: 21,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dotSeparator: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginRight: 2,
  },
  infoText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  amenitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  amenityTag: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  amenityText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  priceRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
});

export const HotelSummary = memo(HotelSummaryComponent);

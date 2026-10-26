import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Hotel,
  formatDateRange,
  formatMealPlan,
} from "@corvax/shared";
import { theme } from "../../theme";
import { PriceTag } from "./PriceTag";

export interface HotelSummaryProps {
  hotel: Hotel;
  showPrice?: boolean;
}

export const HotelSummary: React.FC<HotelSummaryProps> = ({ hotel, showPrice = false }) => {
  const dates = formatDateRange(hotel.check_in, hotel.check_out);
  const meal = hotel.meal_plan ? formatMealPlan(hotel.meal_plan) : "";

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text style={styles.hotelName} numberOfLines={1}>
            🏨 {hotel.hotel}
          </Text>
          <Text style={styles.locationText}>{hotel.city}</Text>
        </View>

        {hotel.rating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>★ {hotel.rating}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>📅 {dates}</Text>
        {meal ? <Text style={styles.infoText}> • 🍽️ {meal}</Text> : null}
      </View>

      {hotel.amenities && hotel.amenities.length > 0 && (
        <View style={styles.amenitiesRow}>
          {hotel.amenities.slice(0, 3).map((amenity, idx) => (
            <View key={idx} style={styles.amenityTag}>
              <Text style={styles.amenityText}>{amenity}</Text>
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
  hotelName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  locationText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  ratingBadge: {
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

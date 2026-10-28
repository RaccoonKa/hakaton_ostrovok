import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Flight, formatDuration } from "@corvax/shared";
import { theme, getTheme } from "../../theme";
import { Icon } from "../common/Icon";

export interface FlightSegmentProps {
  flight: Flight;
  compact?: boolean;
  isDark?: boolean;
}

const FlightSegmentComponent: React.FC<FlightSegmentProps> = ({
  flight,
  compact = false,
  isDark = false,
}) => {
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const durationText = flight.duration ? formatDuration(flight.duration) : "";
  const stopsText = flight.stops === 0 ? "Прямой рейс" : `${flight.stops} пересадка`;

  return (
    <View
      style={[
        styles.container,
        compact && styles.compactContainer,
        {
          backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.routeCol}>
          <Icon name="plane" size={14} color={colors.primary} />
          <Text style={[styles.routeText, { color: colors.textPrimary }]}>
            {flight.origin} → {flight.destination}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: isDark ? colors.surfaceContainerHigh : colors.surfaceContainer },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.primary }]}>{stopsText}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        {flight.carrier ? (
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {flight.carrier}
            {flight.flight_number ? ` • ${flight.flight_number}` : ""}
          </Text>
        ) : null}
        {durationText ? (
          <Text style={[styles.detailText, { color: colors.textSecondary }]}> • {durationText}</Text>
        ) : null}
        {flight.baggage ? (
          <Text style={[styles.detailText, { color: colors.textSecondary }]}> • {flight.baggage}</Text>
        ) : null}
      </View>
    </View>
  );
};

export const FlightSegment = memo(FlightSegmentComponent);

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.canvasMuted,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    gap: 4,
  },
  compactContainer: {
    padding: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  routeText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  badge: {
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  detailText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
});

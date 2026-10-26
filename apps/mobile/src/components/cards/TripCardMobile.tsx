import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { TripOption, formatPrice } from "@corvax/shared";
import { theme } from "../../theme";
import { DemoBadge } from "../common/DemoBadge";
import { PriceTag } from "./PriceTag";
import { FlightSegment } from "./FlightSegment";
import { HotelSummary } from "./HotelSummary";

export interface TripCardMobileProps {
  option: TripOption;
  isSelected?: boolean;
  onSelect?: (option: TripOption) => void;
  onBookDemo?: (option: TripOption) => void;
}

export const TripCardMobile: React.FC<TripCardMobileProps> = ({
  option,
  isSelected = false,
  onSelect,
  onBookDemo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const mainFlight = option.flights?.[0];
  const returnFlight = option.flights?.[1];
  const mainHotel = option.hotels?.[0];

  return (
    <View style={[styles.card, isSelected && styles.selectedCard]}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.destinationCol}>
          <Text style={styles.destinationText}>{option.destination}</Text>
          <Text style={styles.titleText}>{option.title}</Text>
        </View>

        <View style={styles.headerRight}>
          {option.score ? (
            <View style={styles.scorePill}>
              <Text style={styles.scoreText}>{option.score} / 100</Text>
            </View>
          ) : null}
          <DemoBadge variant="subtle" label="Демо" />
        </View>
      </View>

      {/* Description / AI Synthesis */}
      {option.description ? (
        <View style={styles.descBox}>
          <Text style={styles.descText}>{option.description}</Text>
        </View>
      ) : null}

      {/* Hotel & Flight sections */}
      <View style={styles.sections}>
        {mainHotel && <HotelSummary hotel={mainHotel} />}
        {mainFlight && <FlightSegment flight={mainFlight} />}
      </View>

      {/* Expandable Itinerary Timeline (Screen 4) */}
      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.expandButtonText}>
          {isExpanded ? "Свернуть маршрут ▲" : "Маршрут поездки (детали) ▼"}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>Хронология путешествия:</Text>

          {/* Step 1: Outbound Flight */}
          <View style={styles.timelineNode}>
            <View style={styles.nodeIconBubble}>
              <Text style={styles.nodeIcon}>🛫</Text>
            </View>
            <View style={styles.nodeContent}>
              <Text style={styles.nodeHeader}>Прямой перелёт</Text>
              <Text style={styles.nodeSub}>
                {mainFlight ? `${mainFlight.origin} → ${mainFlight.destination} (${mainFlight.carrier || "Авиа"})` : "Вылет в пункт назначения"}
              </Text>
            </View>
          </View>

          {/* Step 2: Transfer */}
          <View style={styles.timelineNode}>
            <View style={[styles.nodeIconBubble, styles.transferIconBubble]}>
              <Text style={styles.nodeIcon}>🚗</Text>
            </View>
            <View style={styles.nodeContent}>
              <Text style={styles.nodeHeader}>Трансфер в отель</Text>
              <Text style={styles.nodeSub}>
                Встреча с табличкой, комфортный минивэн до курорта (~45 мин)
              </Text>
            </View>
          </View>

          {/* Step 3: Hotel */}
          <View style={styles.timelineNode}>
            <View style={[styles.nodeIconBubble, styles.hotelIconBubble]}>
              <Text style={styles.nodeIcon}>🏨</Text>
            </View>
            <View style={styles.nodeContent}>
              <Text style={styles.nodeHeader}>Отдых в отеле</Text>
              <Text style={styles.nodeSub}>
                {mainHotel ? `${mainHotel.hotel} (1-я береговая линия, всё включено)` : "Проживание в выбранном отеле"}
              </Text>
            </View>
          </View>

          {/* Step 4: Return Flight */}
          <View style={styles.timelineNode}>
            <View style={[styles.nodeIconBubble, styles.returnIconBubble]}>
              <Text style={styles.nodeIcon}>🛬</Text>
            </View>
            <View style={styles.nodeContent}>
              <Text style={styles.nodeHeader}>Обратный перелёт</Text>
              <Text style={styles.nodeSub}>
                {returnFlight ? `${returnFlight.origin} → ${returnFlight.destination}` : "Трансфер в аэропорт и вылет домой"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Card Footer: Price & Actions */}
      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceCaption}>Тур целиком:</Text>
          <PriceTag
            amount={option.total_price}
            currency={option.currency}
            size="md"
          />
        </View>

        <View style={styles.actionsRow}>
          {onSelect && (
            <TouchableOpacity
              style={[styles.selectBtn, isSelected && styles.selectBtnActive]}
              onPress={() => onSelect(option)}
            >
              <Text
                style={[
                  styles.selectBtnText,
                  isSelected && styles.selectBtnTextActive,
                ]}
              >
                {isSelected ? "✓ Выбран" : "Выбрать"}
              </Text>
            </TouchableOpacity>
          )}

          {onBookDemo && (
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => onBookDemo(option)}
            >
              <Text style={styles.bookBtnText}>Оформить →</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  selectedCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: "#FBFBFF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  destinationCol: {
    flex: 1,
    marginRight: 8,
  },
  destinationText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  scorePill: {
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  descBox: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 8,
    borderRadius: theme.borderRadius.md,
  },
  descText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  sections: {
    gap: 8,
  },
  expandButton: {
    paddingVertical: 4,
    alignItems: "center",
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  timelineSection: {
    backgroundColor: theme.colors.canvasMuted,
    padding: 10,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  timelineNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nodeIconBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  transferIconBubble: {
    backgroundColor: "#FEF3C7",
  },
  hotelIconBubble: {
    backgroundColor: "#DCFCE7",
  },
  returnIconBubble: {
    backgroundColor: "#E0E7FF",
  },
  nodeIcon: {
    fontSize: 12,
  },
  nodeContent: {
    flex: 1,
  },
  nodeHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  nodeSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: "column",
  },
  priceCaption: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  selectBtnActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  selectBtnTextActive: {
    color: theme.colors.primary,
  },
  bookBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

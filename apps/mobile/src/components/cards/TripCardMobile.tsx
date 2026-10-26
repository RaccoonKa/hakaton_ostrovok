import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { TripOption, formatPrice } from "@corvax/shared";
import { theme } from "../../theme";
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
  const [imageError, setImageError] = useState(false);

  const mainFlight = option.flights?.[0];
  const returnFlight = option.flights?.[1];
  const mainHotel = option.hotels?.[0];

  // Fallback realistic travel image if hotel does not specify one
  const hotelImageUrl =
    mainHotel?.image_url ||
    (option.destination?.includes("ОАЭ") || option.destination?.includes("Дубай") || option.destination?.includes("Хайма")
      ? "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"
      : "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80");

  const hotelRating = mainHotel?.rating || 4.8;
  const ratingBadgeText = hotelRating >= 4.8 ? "4★ Оптимально" : "5★ Премиум";

  return (
    <View style={[styles.card, isSelected && styles.selectedCard]}>
      {/* Visual Cover Banner with Overlay Badges (Stitch Screen 3) */}
      <View style={styles.imageContainer}>
        {!imageError ? (
          <Image
            source={{ uri: hotelImageUrl }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.fallbackIcon}>🏨</Text>
            <Text style={styles.fallbackText}>{mainHotel?.hotel || option.title}</Text>
          </View>
        )}

        {/* Top-Left Rating Pill */}
        <View style={styles.topRatingBadge}>
          <Text style={styles.starIcon}>★</Text>
          <Text style={styles.ratingBadgeLabel}>{ratingBadgeText}</Text>
        </View>

        {/* Bottom-Right Price Tag Overlay */}
        <View style={styles.priceOverlayBadge}>
          <Text style={styles.savingsLabel}>Хит рекомендаций</Text>
          <Text style={styles.priceOverlayValue}>
            {formatPrice(option.total_price, option.currency)}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentBody}>
        {/* Title and Destination Header */}
        <View style={styles.headerInfo}>
          <View style={styles.titleColumn}>
            <Text style={styles.destinationTitle}>{option.destination}</Text>
            <Text style={styles.hotelTitle}>
              {mainHotel?.hotel || option.title}
            </Text>
          </View>

          {option.score ? (
            <View style={styles.aiScoreBadge}>
              <Text style={styles.aiScoreSparkle}>✦</Text>
              <Text style={styles.aiScoreText}>{option.score} / 100</Text>
            </View>
          ) : null}
        </View>

        {/* AI Description / Recommendation Reason */}
        {option.description ? (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>{option.description}</Text>
          </View>
        ) : null}

        {/* Key Features Bullets (Stitch Screen 3) */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏖️</Text>
            <Text style={styles.featureText}>1-я береговая линия, пологий песчаный пляж</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🍽️</Text>
            <Text style={styles.featureText}>Все включено (шведский стол + а-ля карт)</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🏊</Text>
            <Text style={styles.featureText}>Подогреваемый бассейн и детская зона</Text>
          </View>
          {mainFlight ? (
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✈️</Text>
              <Text style={styles.featureText}>
                Прямой рейс {mainFlight.carrier || "Авиа"} • Багаж 20 кг включён
              </Text>
            </View>
          ) : null}
        </View>

        {/* Expandable Itinerary Timeline (Stitch Screen 4) */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.expandButtonContent}>
            <Text style={styles.timelineLabelIcon}>📅</Text>
            <Text style={styles.expandButtonText}>
              {isExpanded ? "Свернуть маршрут" : "Посмотреть маршрут по дням (4 этапа)"}
            </Text>
            <Text style={styles.expandChevron}>{isExpanded ? "▲" : "▼"}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.timelineContainer}>
            <View style={styles.timelineHeaderRow}>
              <Text style={styles.timelineSectionTitle}>Программа путешествия</Text>
              <View style={styles.timelineSynthesisBadge}>
                <Text style={styles.timelineSynthesisDot}>●</Text>
                <Text style={styles.timelineSynthesisText}>План готов</Text>
              </View>
            </View>

            {/* Step 1: Outbound Flight */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineSpine}>
                <View style={styles.timelineNodeCirclePrimary}>
                  <Text style={styles.timelineNodeEmoji}>🛫</Text>
                </View>
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineStepDetails}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTime}>14 ноя, 00:50</Text>
                  <Text style={styles.stepPill}>
                    {mainFlight ? `${mainFlight.origin} → ${mainFlight.destination}` : "DME → RKT"}
                  </Text>
                </View>
                <Text style={styles.stepTitle}>Вылет из Москвы (Домодедово)</Text>
                <Text style={styles.stepDescription}>
                  {mainFlight?.carrier || "Air Arabia"} • Прямой рейс • В пути 5 ч 15 мин • Багаж 20 кг включён
                </Text>
              </View>
            </View>

            {/* Step 2: Transfer */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineSpine}>
                <View style={styles.timelineNodeCircle}>
                  <Text style={styles.timelineNodeEmoji}>🚗</Text>
                </View>
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineStepDetails}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTime}>14 ноя, 06:45</Text>
                  <Text style={styles.stepPill}>Трансфер</Text>
                </View>
                <Text style={styles.stepTitle}>Прилёт и индивидуальный трансфер</Text>
                <Text style={styles.stepDescription}>
                  Встреча с табличкой в зоне прилёта • Комфорт-класс до отеля (~45 мин)
                </Text>
              </View>
            </View>

            {/* Step 3: Hotel */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineSpine}>
                <View style={styles.timelineNodeCircle}>
                  <Text style={styles.timelineNodeEmoji}>🏨</Text>
                </View>
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineStepDetails}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTime}>14–21 ноября</Text>
                  <Text style={styles.stepPill}>7 ночей</Text>
                </View>
                <Text style={styles.stepTitle}>{mainHotel?.hotel || "Radisson Resort Marjan Island 4★"}</Text>
                <Text style={styles.stepDescription}>
                  Superior Sea View • Всё включено • 1-я береговая линия • Детский подогреваемый бассейн
                </Text>
              </View>
            </View>

            {/* Step 4: Return Flight */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineSpine}>
                <View style={styles.timelineNodeCircle}>
                  <Text style={styles.timelineNodeEmoji}>🛬</Text>
                </View>
              </View>
              <View style={styles.timelineStepDetails}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTime}>21 ноя, 18:00</Text>
                  <Text style={styles.stepPill}>
                    {returnFlight ? `${returnFlight.origin} → ${returnFlight.destination}` : "RKT → DME"}
                  </Text>
                </View>
                <Text style={styles.stepTitle}>Обратный прямой рейс в Москву</Text>
                <Text style={styles.stepDescription}>
                  Трансфер из отеля в 14:30 • Прибытие в Домодедово в 22:50
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Card Footer: Summary and Action Buttons */}
        <View style={styles.footer}>
          <View style={styles.footerPriceCol}>
            <Text style={styles.footerPriceCaption}>Перелёт + отель + трансфер</Text>
            <PriceTag
              amount={option.total_price}
              currency={option.currency}
              size="lg"
            />
          </View>

          <View style={styles.actionButtonGroup}>
            {onSelect && (
              <TouchableOpacity
                style={[styles.selectButton, isSelected && styles.selectButtonActive]}
                onPress={() => onSelect(option)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    isSelected && styles.selectButtonTextActive,
                  ]}
                >
                  {isSelected ? "✓ Выбран" : "Выбрать"}
                </Text>
              </TouchableOpacity>
            )}

            {onBookDemo && (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => onBookDemo(option)}
                activeOpacity={0.8}
              >
                <Text style={styles.bookButtonText}>Забронировать →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
    marginBottom: theme.spacing.md,
  },
  selectedCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: "#FFFFFF",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 180,
    backgroundColor: theme.colors.surfaceContainer,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceContainer,
    gap: 6,
  },
  fallbackIcon: {
    fontSize: 40,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  topRatingBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(20, 27, 43, 0.82)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.md,
    gap: 4,
  },
  starIcon: {
    color: "#FACC15",
    fontSize: 13,
  },
  ratingBadgeLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  priceOverlayBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.lg,
    alignItems: "flex-end",
    ...theme.shadows.sm,
  },
  savingsLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.success,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  priceOverlayValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  contentBody: {
    padding: theme.spacing.md,
    gap: 12,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  titleColumn: {
    flex: 1,
  },
  destinationTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hotelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginTop: 2,
    lineHeight: 24,
  },
  aiScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.accentPurpleTint,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: "#DAD7FF",
    gap: 4,
  },
  aiScoreSparkle: {
    color: theme.colors.primary,
    fontSize: 12,
  },
  aiScoreText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  descriptionBox: {
    backgroundColor: theme.colors.canvasSubtle,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  descriptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  featuresList: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    gap: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureIcon: {
    fontSize: 15,
  },
  featureText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: "500",
    flex: 1,
  },
  expandButton: {
    backgroundColor: theme.colors.canvasMuted,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  expandButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  timelineLabelIcon: {
    fontSize: 14,
  },
  expandButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  expandChevron: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  timelineContainer: {
    backgroundColor: theme.colors.canvasSubtle,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  timelineSynthesisBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.accentPurpleTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    gap: 4,
  },
  timelineSynthesisDot: {
    fontSize: 6,
    color: theme.colors.primary,
  },
  timelineSynthesisText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  timelineStep: {
    flexDirection: "row",
    minHeight: 56,
  },
  timelineSpine: {
    alignItems: "center",
    width: 32,
    marginRight: 10,
  },
  timelineNodeCirclePrimary: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineNodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineNodeEmoji: {
    fontSize: 14,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  timelineStepDetails: {
    flex: 1,
    paddingBottom: 14,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepTime: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  stepPill: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  stepDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 12,
    marginTop: 4,
  },
  footerPriceCol: {
    flex: 1,
  },
  footerPriceCaption: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    fontWeight: "500",
    marginBottom: 2,
  },
  actionButtonGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  selectButtonActive: {
    backgroundColor: theme.colors.surfaceContainer,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  selectButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadows.sm,
  },
  bookButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

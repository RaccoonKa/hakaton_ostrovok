import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";
import { TripOption, formatPrice } from "@corvax/shared";
import { theme } from "../../theme";
import { PriceTag } from "./PriceTag";
import { Icon } from "../common/Icon";

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
  const ratingBadgeText = hotelRating >= 4.8 ? "4.9 ★ Оптимально" : "4.8 ★ Премиум";

  return (
    <View style={[styles.card, isSelected && styles.selectedCard]}>
      {/* Visual Cover Banner with Overlay Badges */}
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
            <Icon name="hotel" size={32} color={theme.colors.primary} />
            <Text style={styles.fallbackText}>{mainHotel?.hotel || option.title}</Text>
          </View>
        )}

        {/* Top-Left Rating Pill */}
        <View style={styles.topRatingBadge}>
          <Icon name="star" size={12} color="#F59E0B" filled />
          <Text style={styles.ratingBadgeLabel}>{ratingBadgeText}</Text>
        </View>

        {/* Top-Right "Рекомендуем" badge matching web emerald style */}
        <View style={styles.topRecommendBadge}>
          <Text style={styles.recommendBadgeText}>Рекомендуем</Text>
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
              <Icon name="sparkles" size={12} color={theme.colors.primary} />
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

        {/* Key Features Bullets with Clean Vector Icons */}
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Icon name="sun" size={14} color={theme.colors.primary} />
            <Text style={styles.featureText}>1-я береговая линия, пологий песчаный пляж</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="restaurant" size={14} color={theme.colors.primary} />
            <Text style={styles.featureText}>Все включено (шведский стол + а-ля карт)</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="water" size={14} color={theme.colors.primary} />
            <Text style={styles.featureText}>Подогреваемый бассейн и детская зона</Text>
          </View>
          {mainFlight ? (
            <View style={styles.featureItem}>
              <Icon name="plane" size={14} color={theme.colors.primary} />
              <Text style={styles.featureText}>
                Прямой рейс {mainFlight.carrier || "Авиа"} • Багаж 20 кг включён
              </Text>
            </View>
          ) : null}
        </View>

        {/* Expandable Itinerary Timeline */}
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.expandButtonContent}>
            <Icon name="calendar" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.expandButtonText}>
              {isExpanded ? "Свернуть маршрут" : "Посмотреть маршрут по дням (4 этапа)"}
            </Text>
            <Icon
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={14}
              color={theme.colors.textSecondary}
            />
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
                  <Icon name="plane" size={12} color="#FFFFFF" />
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
                  <Icon name="bus" size={12} color={theme.colors.primary} />
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
                  <Icon name="hotel" size={12} color={theme.colors.primary} />
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
                  <Icon name="plane" size={12} color={theme.colors.primary} />
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
                <View style={styles.buttonInner}>
                  {isSelected && <Icon name="check" size={13} color="#FFFFFF" />}
                  <Text
                    style={[
                      styles.selectButtonText,
                      isSelected && styles.selectButtonTextActive,
                    ]}
                  >
                    {isSelected ? "Выбран" : "Выбрать"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {onBookDemo && (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => onBookDemo(option)}
                activeOpacity={0.8}
              >
                <View style={styles.buttonInner}>
                  <Text style={styles.bookButtonText}>Забронировать</Text>
                  <Icon name="arrow-right" size={13} color="#FFFFFF" />
                </View>
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
    borderColor: theme.colors.primary, // #581C87
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
    backgroundColor: "rgba(24, 24, 27, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  ratingBadgeLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  topRecommendBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  recommendBadgeText: {
    color: "#047857",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  priceOverlayBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(24, 24, 27, 0.88)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    alignItems: "flex-end",
  },
  savingsLabel: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    fontWeight: "500",
  },
  priceOverlayValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  contentBody: {
    padding: theme.spacing.md,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  titleColumn: {
    flex: 1,
    marginRight: 8,
  },
  destinationTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  hotelTitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  aiScoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  aiScoreText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  descriptionBox: {
    backgroundColor: theme.colors.canvasMuted,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  featuresList: {
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  expandButton: {
    backgroundColor: theme.colors.canvasMuted,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  expandButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    flex: 1,
    marginHorizontal: 8,
  },
  timelineContainer: {
    backgroundColor: theme.colors.canvasMuted,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timelineSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  timelineSynthesisBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  timelineSynthesisDot: {
    fontSize: 8,
    color: "#059669",
  },
  timelineSynthesisText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },
  timelineStep: {
    flexDirection: "row",
    marginBottom: 8,
  },
  timelineSpine: {
    alignItems: "center",
    marginRight: 10,
    width: 24,
  },
  timelineNodeCirclePrimary: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineNodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
    minHeight: 24,
  },
  timelineStepDetails: {
    flex: 1,
    paddingBottom: 8,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  stepTime: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  stepPill: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary,
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.borderRadius.xs,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 15,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  footerPriceCol: {
    flex: 1,
  },
  footerPriceCaption: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  actionButtonGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  selectButtonActive: {
    backgroundColor: theme.colors.primary, // #581C87
    borderColor: theme.colors.primary,
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  selectButtonTextActive: {
    color: "#FFFFFF",
  },
  bookButton: {
    backgroundColor: theme.colors.primary, // #581C87
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    ...theme.shadows.sm,
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

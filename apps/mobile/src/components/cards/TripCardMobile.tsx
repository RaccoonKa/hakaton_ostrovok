import React, { useState, memo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  TripOption,
  formatPrice,
  formatDuration,
  formatMealPlan,
  formatDateRange,
} from "@corvax/shared";
import { theme, getTheme } from "../../theme";
import { Icon } from "../common/Icon";

export interface TripCardMobileProps {
  option: TripOption;
  isSelected?: boolean;
  onSelect?: (option: TripOption | null) => void;
  onBookDemo?: (option: TripOption) => void;
  isDark?: boolean;
}

const TripCardMobileComponent: React.FC<TripCardMobileProps> = ({
  option,
  isSelected = false,
  onSelect,
  onBookDemo,
  isDark = false,
}) => {
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const [isExpanded, setIsExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const mainFlight = option.flights?.[0];
  const returnFlight = option.flights?.[1];
  const primaryTransport = option.transports?.[0] || option.transport?.[0];
  const isTrain = !mainFlight && !!primaryTransport;
  const mainHotel = option.hotels?.[0];

  // Dynamic realistic image fallback matching web getDestinationImage
  const getDestinationImage = (dest?: string) => {
    if (mainHotel?.image_url) return mainHotel.image_url;
    if (dest?.includes("ОАЭ") || dest?.includes("Хайм") || dest?.includes("Дубай")) {
      return "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80";
    }
    if (dest?.includes("Анталь") || dest?.includes("Турци") || dest?.includes("Белек")) {
      return "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80";
    }
    if (dest?.includes("Сочи") || dest?.includes("Полян")) {
      return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80";
    }
    if (dest?.includes("Стамбул")) {
      return "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80";
    }
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";
  };

  const imageSrc = getDestinationImage(option.destination || option.title);
  const hotelRating = mainHotel?.rating || (option.score ? (option.score / 20) : 4.8);
  const dateRangeStr =
    mainHotel?.check_in && mainHotel?.check_out
      ? formatDateRange(mainHotel.check_in, mainHotel.check_out)
      : "7 ночей";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
        },
        isSelected && styles.selectedCard,
      ]}
    >
      {/* Cover Image */}
      <View
        style={[
          styles.imageContainer,
          { backgroundColor: isDark ? colors.surfaceContainer : "#F0EDF1" },
        ]}
      >
        {!imageError ? (
          <Image
            source={{ uri: imageSrc }}
            style={styles.coverImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={[
              styles.imageFallback,
              { backgroundColor: isDark ? colors.surfaceContainer : "#F0EDF1" },
            ]}
          >
            <Icon name={isTrain ? "train" : "hotel"} size={32} color={colors.primary} />
            <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
              {mainHotel?.hotel || option.title}
            </Text>
          </View>
        )}

        {/* Top-Left Rating Badge */}
        <View
          style={[
            styles.ratingBadge,
            {
              backgroundColor: isDark ? "rgba(24, 23, 38, 0.95)" : "rgba(255, 255, 255, 0.95)",
            },
          ]}
        >
          <Icon name="star" size={11} color="#F59E0B" filled />
          <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
            {Number(hotelRating).toFixed(1)}
          </Text>
        </View>

        {/* Top-Right Emerald "Рекомендуем" badge */}
        <View style={styles.recommendBadge}>
          <Text style={styles.recommendBadgeText}>Рекомендуем</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.body}>
        {/* Title and Hotel */}
        <View style={styles.titleRow}>
          <View style={styles.titleCol}>
            <Text style={[styles.destinationTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {option.destination || option.title}
            </Text>
            {mainHotel?.hotel ? (
              <Text style={[styles.hotelTitle, { color: colors.primary }]} numberOfLines={1}>
                {mainHotel.hotel}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Description */}
        {option.description ? (
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            {option.description}
          </Text>
        ) : null}

        {/* Dynamic Features Row */}
        <View style={styles.featuresRow}>
          {isTrain ? (
            <View
              style={[
                styles.featureItem,
                { backgroundColor: isDark ? colors.surfaceContainerLow : "#F6F2F7" },
              ]}
            >
              <Icon name="train" size={12} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                {primaryTransport?.carrier || "Поезд РЖД"}
                {primaryTransport?.transit_point
                  ? ` • Стыковка: ${primaryTransport.transit_point}`
                  : primaryTransport?.duration
                  ? ` • ${formatDuration(primaryTransport.duration)}`
                  : ""}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.featureItem,
                { backgroundColor: isDark ? colors.surfaceContainerLow : "#F6F2F7" },
              ]}
            >
              <Icon name="plane" size={12} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                {mainFlight?.stops && mainFlight.stops > 0
                  ? `${mainFlight.carrier || "Рейс"} • ${mainFlight.stops} пересадк${
                      mainFlight.stops === 1 ? "а" : mainFlight.stops < 5 ? "и" : "ек"
                    }${mainFlight.transit_point ? ` (${mainFlight.transit_point})` : ""}`
                  : `${mainFlight?.carrier || "Прямой рейс"}${
                      mainFlight?.duration ? ` • ${formatDuration(mainFlight.duration)}` : ""
                    }`}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.featureItem,
              { backgroundColor: isDark ? colors.surfaceContainerLow : "#F6F2F7" },
            ]}
          >
            <Icon name="briefcase" size={12} color={colors.textMuted} />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              {mainFlight?.baggage || primaryTransport?.baggage || "Багаж включён"}
            </Text>
          </View>

          {mainHotel?.meal_plan ? (
            <View
              style={[
                styles.featureItem,
                { backgroundColor: isDark ? colors.surfaceContainerLow : "#F6F2F7" },
              ]}
            >
              <Icon name="restaurant" size={12} color={colors.textMuted} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                {formatMealPlan(mainHotel.meal_plan)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Expand/Collapse Timeline Button */}
        <TouchableOpacity
          style={[
            styles.expandToggle,
            { borderTopColor: colors.borderSubtle },
          ]}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Icon name="calendar" size={13} color={colors.textSecondary} />
          <Text style={[styles.expandToggleText, { color: colors.textSecondary }]}>
            {isExpanded ? "Скрыть маршрут" : "Посмотреть маршрут по дням"}
          </Text>
          <Icon
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={13}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Dynamic Chronological Itinerary */}
        {isExpanded && (
          <View style={styles.timeline}>
            {/* Step 1: Outbound Transport */}
            {isTrain ? (
              <View style={styles.timelineStep}>
                <View style={styles.timelineIconCol}>
                  <View style={[styles.timelineDotPrimary, { backgroundColor: colors.primary }]}>
                    <Icon name="train" size={10} color="#FFFFFF" />
                  </View>
                  <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineStepTime, { color: colors.primary }]}>День 1 • Поезд</Text>
                  <Text style={[styles.timelineStepTitle, { color: colors.textPrimary }]}>
                    Поезд: {primaryTransport?.origin || "Москва"} → {primaryTransport?.destination || option.destination}
                  </Text>
                  <Text style={[styles.timelineStepDesc, { color: colors.textSecondary }]}>
                    {primaryTransport?.carrier || "Поезд РЖД"}
                    {primaryTransport?.flight_number ? ` №${primaryTransport.flight_number}` : ""} •{" "}
                    {primaryTransport?.transit_point ? `Стыковка: ${primaryTransport.transit_point}` : "Прямой маршрут"} •{" "}
                    {primaryTransport?.duration ? `В пути ${formatDuration(primaryTransport.duration)}` : "Комфортный вагон"}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.timelineStep}>
                <View style={styles.timelineIconCol}>
                  <View style={[styles.timelineDotPrimary, { backgroundColor: colors.primary }]}>
                    <Icon name="plane" size={10} color="#FFFFFF" />
                  </View>
                  <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineStepTime, { color: colors.primary }]}>День 1 • Перелёт</Text>
                  <Text style={[styles.timelineStepTitle, { color: colors.textPrimary }]}>
                    Вылет: {mainFlight?.origin || "Москва"} → {mainFlight?.destination || option.destination}
                  </Text>
                  <Text style={[styles.timelineStepDesc, { color: colors.textSecondary }]}>
                    {mainFlight?.carrier || "Регулярный рейс"}
                    {mainFlight?.flight_number ? ` (${mainFlight.flight_number})` : ""} •{" "}
                    {mainFlight?.stops === 0
                      ? "Прямой рейс"
                      : `С пересадкой${mainFlight?.transit_point ? ` (${mainFlight.transit_point})` : ""}`} •{" "}
                    {mainFlight?.duration ? `В пути ${formatDuration(mainFlight.duration)}` : "Удобное расписание"}
                    {mainFlight?.layover_duration ? ` • Стыковка ${formatDuration(mainFlight.layover_duration)}` : ""}
                  </Text>
                </View>
              </View>
            )}

            {/* Step 2: Transfer */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineIconCol}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: isDark ? colors.surfaceContainer : "#F0EDF1",
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Icon name="bus" size={10} color={colors.primary} />
                </View>
                <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineStepTime, { color: colors.primary }]}>День 1 • Трансфер</Text>
                <Text style={[styles.timelineStepTitle, { color: colors.textPrimary }]}>Встреча и трансфер в отель</Text>
                <Text style={[styles.timelineStepDesc, { color: colors.textSecondary }]}>
                  {isTrain
                    ? "Комфортабельный трансфер от вокзала до стойки регистрации отеля"
                    : "Комфортабельный трансфер от аэропорта до стойки регистрации отеля"}
                </Text>
              </View>
            </View>

            {/* Step 3: Resort stay */}
            <View style={styles.timelineStep}>
              <View style={styles.timelineIconCol}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      backgroundColor: isDark ? colors.surfaceContainer : "#F0EDF1",
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Icon name="hotel" size={10} color={colors.primary} />
                </View>
                <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineStepTime, { color: colors.primary }]}>{dateRangeStr}</Text>
                <Text style={[styles.timelineStepTitle, { color: colors.textPrimary }]}>
                  Отдых: {mainHotel?.hotel || option.destination}
                </Text>
                <Text style={[styles.timelineStepDesc, { color: colors.textSecondary }]}>
                  {mainHotel?.city ? `Курорт ${mainHotel.city}. ` : ""}
                  {mainHotel?.meal_plan ? `${formatMealPlan(mainHotel.meal_plan)}. ` : "Питание включено. "}
                  Комфортный номер, отдых и инфраструктура отеля
                </Text>
              </View>
            </View>

            {/* Step 4: Return transport */}
            {isTrain ? (
              <View style={styles.timelineStep}>
                <View style={styles.timelineIconCol}>
                  <View style={[styles.timelineDotPrimary, { backgroundColor: colors.primary }]}>
                    <Icon name="train" size={10} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineStepTime, { color: colors.primary }]}>День выезда • Обратный поезд</Text>
                  <Text style={[styles.timelineStepTitle, { color: colors.textPrimary }]}>
                    Поезд: {primaryTransport?.destination || option.destination} →{" "}
                    {primaryTransport?.origin || "Москва"}
                  </Text>
                  <Text style={[styles.timelineStepDesc, { color: colors.textSecondary }]}>
                    Трансфер на вокзал и дневная поездка домой на поезде {primaryTransport?.carrier || "РЖД"}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.timelineStep}>
                <View style={styles.timelineIconCol}>
                  <View style={[styles.timelineDotPrimary, { backgroundColor: colors.primary }]}>
                    <Icon name="plane" size={10} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineStepTime, { color: colors.primary }]}>День выезда • Обратный вылет</Text>
                  <Text style={[styles.timelineStepTitle, { color: colors.textPrimary }]}>
                    Перелёт: {returnFlight?.origin || mainFlight?.destination || option.destination} →{" "}
                    {returnFlight?.destination || mainFlight?.origin || "Москва"}
                  </Text>
                  <Text style={[styles.timelineStepDesc, { color: colors.textSecondary }]}>
                    Трансфер в аэропорт и комфортный рейс домой
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Pricing and Action Footer */}
        <View
          style={[
            styles.footerRow,
            { borderTopColor: colors.borderSubtle },
          ]}
        >
          <View style={styles.priceCol}>
            <Text style={[styles.priceLabel, { color: colors.textMuted }]}>Итого за тур:</Text>
            <Text
              style={[styles.priceValue, { color: colors.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              ~{formatPrice(option.total_price, option.currency).replace(/ /g, "\u00A0")}
            </Text>
          </View>

          <View style={styles.actionButtonsCol}>
            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: colors.primary },
                isSelected && styles.selectButtonActive,
              ]}
              onPress={() => onSelect?.(isSelected ? null : option)}
              activeOpacity={0.8}
            >
              {isSelected ? (
                <>
                  <Icon name="check" size={13} color="#FFFFFF" />
                  <Text style={styles.selectButtonText}>Выбрано</Text>
                </>
              ) : (
                <>
                  <Text style={styles.selectButtonText}>Выбрать</Text>
                  <Icon name="arrow-right" size={13} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {onBookDemo && (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => onBookDemo(option)}
                activeOpacity={0.8}
                accessibilityLabel="Забронировать тур"
              >
                <Text style={styles.bookButtonText}>Бронь</Text>
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
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    marginVertical: 6,
    ...theme.shadows.sm,
  },
  selectedCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  imageContainer: {
    width: "100%",
    height: 160,
    backgroundColor: theme.colors.surfaceContainer,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.surfaceContainer,
  },
  fallbackText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  ratingBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    gap: 4,
    ...theme.shadows.sm,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  recommendBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: theme.colors.badgeRecommendBg,
    borderColor: "#A7F3D0",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  recommendBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.badgeRecommendText,
  },
  body: {
    padding: theme.spacing.md,
    gap: 10,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleCol: {
    flex: 1,
  },
  destinationTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  hotelTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
    marginTop: 2,
  },
  descriptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  featuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 5,
  },
  featureText: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textSecondary,
  },
  expandToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    marginTop: 2,
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    flex: 1,
  },
  timeline: {
    paddingLeft: 4,
    paddingTop: 4,
    gap: 8,
  },
  timelineStep: {
    flexDirection: "row",
    gap: 10,
  },
  timelineIconCol: {
    alignItems: "center",
    width: 20,
  },
  timelineDotPrimary: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineStepTime: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  timelineStepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginTop: 1,
  },
  timelineStepDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 10,
    marginTop: 3,
    gap: 8,
  },
  priceCol: {
    flex: 1,
    minWidth: 105,
    justifyContent: "center",
  },
  priceLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    lineHeight: 14,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: "800",
    color: theme.colors.primary,
    letterSpacing: -0.3,
    marginTop: 1,
  },
  actionButtonsCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    gap: 5,
  },
  selectButtonActive: {
    backgroundColor: "#047857",
  },
  selectButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bookButton: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  bookButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export const TripCardMobile = memo(TripCardMobileComponent);

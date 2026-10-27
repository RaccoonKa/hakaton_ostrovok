import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  TripOption,
  formatPrice,
  formatDateRange,
  formatDuration,
  formatMealPlan,
} from "@corvax/shared";
import { theme } from "../../theme";
import { Icon } from "../common/Icon";
import { FlightSegment } from "./FlightSegment";
import { HotelSummary } from "./HotelSummary";

export interface TripDossierViewProps {
  option: TripOption;
  onBackToList: () => void;
  onBookTour: (option: TripOption) => void;
}

export const TripDossierView: React.FC<TripDossierViewProps> = ({
  option,
  onBackToList,
  onBookTour,
}) => {
  const primaryFlight = option.flights?.[0];
  const returnFlight = option.flights?.[1];
  const primaryHotel = option.hotels?.[0];

  const dateRangeStr =
    primaryHotel?.check_in && primaryHotel?.check_out
      ? formatDateRange(primaryHotel.check_in, primaryHotel.check_out)
      : "7 ночей";

  const flightsTotal = option.budget?.flights_total ?? Math.round((option.total_price || 150000) * 0.45);
  const hotelsTotal = option.budget?.hotels_total ?? Math.round((option.total_price || 150000) * 0.45);
  const transfersTotal = option.budget?.transfers_total ?? Math.round((option.total_price || 150000) * 0.1);
  const totalPriceFormatted = formatPrice(option.total_price, option.currency);

  return (
    <View style={styles.container}>
      {/* Dossier Header */}
      <View style={styles.dossierHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToList}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={16} color={theme.colors.primary} />
          <Text style={styles.backButtonText}>К списку направлений</Text>
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <Text style={styles.destinationTitle}>
            {option.destination || option.title}
          </Text>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>Тур сформирован</Text>
          </View>
        </View>

        {option.description ? (
          <Text style={styles.descriptionText}>{option.description}</Text>
        ) : null}
      </View>

      {/* Flight Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Icon name="plane" size={16} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Перелёт (туда и обратно)</Text>
        </View>

        {primaryFlight && <FlightSegment flight={primaryFlight} />}
        {returnFlight && <FlightSegment flight={returnFlight} />}
      </View>

      {/* Hotel Section */}
      {primaryHotel && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Icon name="hotel" size={16} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Отель и размещение</Text>
          </View>
          <HotelSummary hotel={primaryHotel} showPrice={false} />
        </View>
      )}

      {/* 4-Stage Itinerary Timeline */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Icon name="calendar" size={16} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Маршрут по этапам ({dateRangeStr})</Text>
        </View>

        <View style={styles.timelineList}>
          {/* Stage 1 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineSpine}>
              <View style={styles.dotPrimary}>
                <Icon name="plane" size={10} color="#FFFFFF" />
              </View>
              <View style={styles.spineLine} />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.stageTime}>Этап 1 • Отправление</Text>
              <Text style={styles.stageTitle}>
                {primaryFlight?.origin || "Москва"} → {primaryFlight?.destination || option.destination}
              </Text>
              <Text style={styles.stageDesc}>
                {primaryFlight?.carrier || "Регулярный рейс"}
                {primaryFlight?.duration ? ` • В пути ${formatDuration(primaryFlight.duration)}` : ""}
                {primaryFlight?.baggage ? ` • ${primaryFlight.baggage}` : ""}
              </Text>
            </View>
          </View>

          {/* Stage 2 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineSpine}>
              <View style={styles.dotSecondary}>
                <Icon name="bus" size={10} color={theme.colors.primary} />
              </View>
              <View style={styles.spineLine} />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.stageTime}>Этап 2 • Встреча</Text>
              <Text style={styles.stageTitle}>Трансфер в отель</Text>
              <Text style={styles.stageDesc}>
                Встреча в зале прилёта, комфортабельный трансфер прямо ко входу в отель
              </Text>
            </View>
          </View>

          {/* Stage 3 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineSpine}>
              <View style={styles.dotSecondary}>
                <Icon name="hotel" size={10} color={theme.colors.primary} />
              </View>
              <View style={styles.spineLine} />
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.stageTime}>Этап 3 • Проживание ({dateRangeStr})</Text>
              <Text style={styles.stageTitle}>
                {primaryHotel?.hotel || option.destination}
              </Text>
              <Text style={styles.stageDesc}>
                {primaryHotel?.meal_plan ? `${formatMealPlan(primaryHotel.meal_plan)} • ` : ""}
                Первая линия, отдых и инфраструктура отеля
              </Text>
            </View>
          </View>

          {/* Stage 4 */}
          <View style={styles.timelineRow}>
            <View style={styles.timelineSpine}>
              <View style={styles.dotPrimary}>
                <Icon name="plane" size={10} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.timelineBody}>
              <Text style={styles.stageTime}>Этап 4 • Возвращение</Text>
              <Text style={styles.stageTitle}>
                {returnFlight?.origin || primaryFlight?.destination || option.destination} →{" "}
                {returnFlight?.destination || primaryFlight?.origin || "Москва"}
              </Text>
              <Text style={styles.stageDesc}>
                Трансфер в аэропорт и дневной перелёт домой
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Itemized Price Breakdown */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Icon name="sparkles" size={16} color={theme.colors.primary} />
          <Text style={styles.sectionTitle}>Детализация сметы</Text>
        </View>

        <View style={styles.priceItem}>
          <Text style={styles.priceItemLabel}>Авиабилеты (туда и обратно):</Text>
          <Text style={styles.priceItemValue}>
            {formatPrice(flightsTotal, option.currency)}
          </Text>
        </View>

        <View style={styles.priceItem}>
          <Text style={styles.priceItemLabel}>Проживание в отеле:</Text>
          <Text style={styles.priceItemValue}>
            {formatPrice(hotelsTotal, option.currency)}
          </Text>
        </View>

        <View style={styles.priceItem}>
          <Text style={styles.priceItemLabel}>Трансферы и сопровождение:</Text>
          <Text style={styles.priceItemValue}>
            {formatPrice(transfersTotal, option.currency)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Итого за весь тур:</Text>
          <Text
            style={styles.totalValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {totalPriceFormatted}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => onBookTour(option)}
          activeOpacity={0.85}
        >
          <Text
            style={styles.bookButtonText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            Забронировать тур • {totalPriceFormatted}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 4,
  },
  dossierHeader: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadows.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  destinationTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    flex: 1,
  },
  categoryPill: {
    backgroundColor: theme.colors.badgeRecommendBg,
    borderColor: "#A7F3D0",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.badgeRecommendText,
  },
  descriptionText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.sm,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  timelineList: {
    gap: 8,
    paddingTop: 4,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 10,
  },
  timelineSpine: {
    alignItems: "center",
    width: 20,
  },
  dotPrimary: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dotSecondary: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  spineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 2,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 10,
  },
  stageTime: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  stageTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  stageDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  priceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  priceItemLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  priceItemValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontSize: 19,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  bookButton: {
    backgroundColor: theme.colors.secondary, // Ostrovok warm Orange
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...theme.shadows.md,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

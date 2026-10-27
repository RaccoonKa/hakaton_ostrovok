import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  TripOption,
  formatPrice,
  formatDateRange,
  formatMealPlan,
  formatDuration,
} from "@corvax/shared";
import { theme } from "../../theme";
import { Icon } from "../common/Icon";
import { TravelerEditModal, TravelerData } from "./TravelerEditModal";

export interface BookingCheckoutModalProps {
  visible: boolean;
  option: TripOption | null;
  onClose: () => void;
  onConfirmSuccess?: (bookingId: string) => void;
  initialTraveler?: TravelerData;
}

export const BookingCheckoutModal: React.FC<BookingCheckoutModalProps> = ({
  visible,
  option,
  onClose,
  onConfirmSuccess,
  initialTraveler,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [pnrCode, setPnrCode] = useState("7W4KL9");
  const [traveler, setTraveler] = useState<TravelerData>(() => initialTraveler || {
    name: "Алексей Смирнов",
    phone: "+7 (999) 123-45-67",
    email: "alexey.smirnov@example.com",
  });

  React.useEffect(() => {
    if (initialTraveler) {
      setTraveler(initialTraveler);
    }
  }, [initialTraveler?.name, initialTraveler?.phone, initialTraveler?.email]);
  const [editTravelerVisible, setEditTravelerVisible] = useState(false);

  if (!option) return null;

  const hotel = option.hotels?.[0];
  const flight = option.flights?.[0];
  const returnFlight = option.flights?.[1];

  const dates =
    hotel?.check_in && hotel?.check_out
      ? formatDateRange(hotel.check_in, hotel.check_out)
      : "Даты согласованы";

  const totalPriceFormatted = formatPrice(option.total_price, option.currency);

  const handleConfirm = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      const generatedId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
      const randomPnr = `${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(
        10 + Math.random() * 89
      )}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}9`;
      setBookingId(generatedId);
      setPnrCode(randomPnr);
      setLoading(false);
      setConfirmed(true);
      onConfirmSuccess?.(generatedId);
    }, 800);
  };

  const handleShareVoucher = async () => {
    try {
      await Share.share({
        message: `Маршрут и бронирование: ${option.destination || option.title}\nЗаявка: #${bookingId} (PNR: ${pnrCode})\nОтель: ${hotel?.hotel || "Отель"}\nДаты: ${dates}\nСтоимость: ${totalPriceFormatted}`,
        title: `Бронь #${bookingId}`,
      });
    } catch {
      // Ignored
    }
  };

  const handleClose = () => {
    setConfirmed(false);
    setBookingId("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerTitle}>
                {confirmed ? "Бронирование подтверждено" : "Оформление поездки"}
              </Text>
              {confirmed ? (
                <Text style={styles.headerSub}>
                  Заявка #{bookingId} • PNR: {pnrCode}
                </Text>
              ) : (
                <Text style={styles.headerSub}>
                  {option.destination || option.title}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              accessibilityLabel="Закрыть"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Status / Trust Banner */}
            <View style={[styles.statusBanner, confirmed && styles.statusBannerSuccess]}>
              <Icon
                name={confirmed ? "check" : "shield"}
                size={20}
                color={confirmed ? "#047857" : theme.colors.primary}
              />
              <View style={styles.statusBannerTextCol}>
                <Text
                  style={[
                    styles.statusBannerTitle,
                    confirmed && { color: "#047857" },
                  ]}
                >
                  {confirmed
                    ? "Маршрут-квитанции и ваучер сформированы"
                    : "Мгновенное бронирование маршрута"}
                </Text>
                <Text style={styles.statusBannerDesc}>
                  {confirmed
                    ? `Документы оформлены на имя: ${traveler.name}. Копия отправлена на ${traveler.email}`
                    : "Бесплатная отмена за 24 ч до заезда • Подтверждение отеля и билетов"}
                </Text>
              </View>
            </View>

            {/* Hotel & Stay Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardIconBox}>
                  <Icon name="hotel" size={16} color={theme.colors.primary} />
                </View>
                <View style={styles.cardHeaderTextCol}>
                  <Text style={styles.cardLabel}>Гостиничный ваучер</Text>
                  <Text style={styles.cardMainTitle}>
                    {hotel?.hotel || option.title}
                  </Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Даты проживания</Text>
                  <Text style={styles.metaValue}>{dates}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Локация</Text>
                  <Text style={styles.metaValue}>
                    {hotel?.city || option.destination || "Курорт"}
                  </Text>
                </View>
                {hotel?.meal_plan ? (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Питание</Text>
                    <Text style={styles.metaValue}>
                      {formatMealPlan(hotel.meal_plan)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Flight Card */}
            {flight ? (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardIconBox}>
                    <Icon name="plane" size={16} color={theme.colors.primary} />
                  </View>
                  <View style={styles.cardHeaderTextCol}>
                    <Text style={styles.cardLabel}>Электронные авиабилеты</Text>
                    <Text style={styles.cardMainTitle}>
                      {flight.origin} ⇄ {flight.destination}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Авиакомпания</Text>
                    <Text style={styles.metaValue}>
                      {flight.carrier || "Регулярный рейс"}
                      {flight.flight_number ? ` (${flight.flight_number})` : ""}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Багаж</Text>
                    <Text style={styles.metaValue}>
                      {flight.baggage || "Включён (20 кг)"}
                    </Text>
                  </View>
                  {flight.duration ? (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Время в полёте</Text>
                      <Text style={styles.metaValue}>
                        {formatDuration(flight.duration)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Traveler Information Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderWithAction}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardIconBox}>
                    <Icon name="user" size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.cardLabel}>Данные туриста</Text>
                </View>
                {!confirmed && (
                  <TouchableOpacity
                    onPress={() => setEditTravelerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editActionText}>Изменить</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.travelerRow}>
                <Text style={styles.travelerName}>{traveler.name}</Text>
                <Text style={styles.travelerContact}>
                  {traveler.phone} • {traveler.email}
                </Text>
              </View>
            </View>

            {/* Pricing Summary */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Смета путешествия</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>Авиаперелёт и отель</Text>
                <Text style={styles.priceRowValue}>{totalPriceFormatted}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>Трансфер и сопровождение</Text>
                <Text style={[styles.priceRowValue, { color: "#047857" }]}>
                  Включено
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Итого к оплате:</Text>
                <Text style={styles.totalValue}>{totalPriceFormatted}</Text>
              </View>
            </View>

            {/* Actions */}
            {confirmed ? (
              <View style={styles.confirmedActionsCol}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShareVoucher}
                  activeOpacity={0.8}
                >
                  <Icon name="share" size={16} color={theme.colors.primary} />
                  <Text style={styles.shareButtonText}>
                    Поделиться ваучером и билетами
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Готово</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.buttonDisabled]}
                onPress={handleConfirm}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Подтвердить бронирование • {totalPriceFormatted}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Traveler Edit Sub-modal */}
        <TravelerEditModal
          visible={editTravelerVisible}
          initialData={traveler}
          onClose={() => setEditTravelerVisible(false)}
          onSave={setTraveler}
        />
      </View>
    </Modal>
  );
};

export const DemoCheckoutModal = BookingCheckoutModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: "92%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    maxHeight: "100%",
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.primaryLight,
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(88, 28, 135, 0.15)",
    gap: 12,
  },
  statusBannerSuccess: {
    backgroundColor: theme.colors.badgeRecommendBg,
    borderColor: "#A7F3D0",
  },
  statusBannerTextCol: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  statusBannerDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardHeaderWithAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
  },
  cardMainTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    marginTop: 1,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 4,
  },
  metaItem: {
    minWidth: "45%",
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  editActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  travelerRow: {
    gap: 2,
    paddingTop: 2,
  },
  travelerName: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  travelerContact: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  priceRowLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  priceRowValue: {
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
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  confirmedActionsCol: {
    gap: 10,
    marginTop: 4,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
});

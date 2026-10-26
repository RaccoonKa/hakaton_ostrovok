import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TripOption, formatPrice, formatDateRange } from "@corvax/shared";
import { theme } from "../../theme";
import { TravelerEditModal, TravelerData } from "./TravelerEditModal";

export interface DemoCheckoutModalProps {
  visible: boolean;
  option: TripOption | null;
  onClose: () => void;
  onConfirmSuccess?: (bookingId: string) => void;
}

export const DemoCheckoutModal: React.FC<DemoCheckoutModalProps> = ({
  visible,
  option,
  onClose,
  onConfirmSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [traveler, setTraveler] = useState<TravelerData>({
    name: "Алексей Смирнов",
    phone: "+7 (999) 456-78-90",
    email: "alex.smirnov@example.com",
  });
  const [editTravelerVisible, setEditTravelerVisible] = useState(false);

  if (!option) return null;

  const hotel = option.hotels?.[0];
  const flight = option.flights?.[0];
  const dates = hotel ? formatDateRange(hotel.check_in, hotel.check_out) : "14–21 ноября (7 ночей)";
  const totalPriceFormatted = formatPrice(option.total_price, option.currency);

  const handleConfirm = () => {
    if (!agreed || loading) return;

    setLoading(true);
    setTimeout(() => {
      const generatedId = `OD-${Math.floor(10000 + Math.random() * 90000)}`;
      setBookingId(generatedId);
      setLoading(false);
      setConfirmed(true);
      onConfirmSuccess?.(generatedId);
    }, 900);
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
          {/* Sheet Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Оформление поездки</Text>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>Гарантия лучшей цены</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              accessibilityLabel="Закрыть"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Trust and Safety Banner */}
            <View style={styles.trustBanner}>
              <Text style={styles.trustBannerIcon}>🛡️</Text>
              <View style={styles.trustBannerContent}>
                <Text style={styles.trustBannerTitle}>
                  Безопасное оформление бронирования
                </Text>
                <Text style={styles.trustBannerText}>
                  Бесплатная отмена за 24 ч • Мгновенное подтверждение авиабилетов и ваучера отеля
                </Text>
              </View>
            </View>

            {/* Trip Summary Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardCaption}>Параметры тура</Text>
                <Text style={styles.cardDates}>{dates}</Text>
              </View>

              <Text style={styles.hotelTitle}>{hotel?.hotel || option.title}</Text>
              <Text style={styles.destinationSub}>
                {option.destination} • 1-я береговая линия • Всё включено
              </Text>

              <View style={styles.divider} />

              <View style={styles.paramRow}>
                <Text style={styles.paramIcon}>✈️</Text>
                <Text style={styles.paramText}>
                  {flight
                    ? `${flight.origin} ⇄ ${flight.destination} (${flight.carrier || "Air Arabia"}) • Багаж включён`
                    : "Москва (DME) ⇄ Рас-эль-Хайма/Дубай • Багаж 20 кг включён"}
                </Text>
              </View>

              <View style={styles.paramRow}>
                <Text style={styles.paramIcon}>👥</Text>
                <Text style={styles.paramText}>1 взрослый + 1 ребёнок (5 лет)</Text>
              </View>
            </View>

            {/* Traveler Information with Edit Action */}
            <View style={styles.card}>
              <View style={styles.travelerHeader}>
                <Text style={styles.cardCaption}>Данные путешественника</Text>
                <TouchableOpacity
                  onPress={() => setEditTravelerVisible(true)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={styles.editActionText}>Изменить ✎</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Основной турист</Text>
                <Text style={styles.infoValue}>{traveler.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Телефон (СМС-статус)</Text>
                <Text style={styles.infoValue}>{traveler.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Электронная почта</Text>
                <Text style={styles.infoValue}>{traveler.email}</Text>
              </View>
            </View>

            {/* Cost Breakdown */}
            <View style={styles.card}>
              <Text style={styles.cardCaption}>Детализация стоимости</Text>

              <View style={styles.priceRow}>
                <Text style={styles.priceItemLabel}>Проживание и авиаперелёт (2 чел.)</Text>
                <Text style={styles.priceItemValue}>
                  {formatPrice(Math.round((option.total_price || 163900) * 0.9), option.currency)}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceItemLabel}>Топливный сбор и трансфер до отеля</Text>
                <Text style={styles.priceItemValue}>
                  {formatPrice(Math.round((option.total_price || 163900) * 0.1), option.currency)}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceItemLabel}>Сервисный сбор подбора</Text>
                <Text style={[styles.priceItemValue, { color: theme.colors.primary }]}>
                  0 ₽ (Бесплатно)
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>Итого к оплате</Text>
                  <Text style={styles.totalSub}>Включая все налоги и сборы</Text>
                </View>
                <Text style={styles.totalValue}>{totalPriceFormatted}</Text>
              </View>
            </View>

            {/* Agreement Checkbox */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkboxText}>
                Я согласен с условиями бронирования, правилами применения тарифа и политикой конфиденциальности
              </Text>
            </TouchableOpacity>

            {/* Success Confirmation Banner */}
            {confirmed && (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>🎉</Text>
                <View style={styles.successTextCol}>
                  <Text style={styles.successTitle}>Бронирование подтверждено!</Text>
                  <Text style={styles.successSub}>
                    Заказ {bookingId}. Маршрутная квитанция и отельный ваучер высланы на {traveler.email}.
                  </Text>
                </View>
              </View>
            )}

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[
                styles.ctaButton,
                (!agreed || loading) && styles.ctaButtonDisabled,
                confirmed && styles.ctaButtonSuccess,
              ]}
              onPress={confirmed ? handleClose : handleConfirm}
              disabled={!agreed || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaButtonText}>
                  {confirmed
                    ? "Завершить и закрыть"
                    : `Забронировать поездку (${totalPriceFormatted}) →`}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.encryptionRow}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.encryptionText}>256-битное защищённое шифрование</Text>
            </View>
          </ScrollView>

          {/* Traveler Edit Dialog */}
          <TravelerEditModal
            visible={editTravelerVisible}
            initialData={traveler}
            onClose={() => setEditTravelerVisible(false)}
            onSave={setTraveler}
          />
        </View>
      </View>
    </Modal>
  );
};

export const BookingCheckoutModal = DemoCheckoutModal;

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
    overflow: "hidden",
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  verifiedBadge: {
    backgroundColor: theme.colors.accentPurpleTint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  scroll: {
    maxHeight: "100%",
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  trustBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    gap: 10,
  },
  trustBannerIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  trustBannerContent: {
    flex: 1,
  },
  trustBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  trustBannerText: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...theme.shadows.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  travelerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  cardCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDates: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  hotelTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  destinationSub: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: 4,
  },
  paramRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paramIcon: {
    fontSize: 15,
  },
  paramText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  totalRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  totalSub: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  checkboxText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.successBg,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  successIcon: {
    fontSize: 26,
  },
  successTextCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  successSub: {
    fontSize: 12,
    color: "#15803D",
    marginTop: 2,
    lineHeight: 16,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...theme.shadows.md,
  },
  ctaButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  ctaButtonSuccess: {
    backgroundColor: theme.colors.success,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  encryptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 2,
  },
  lockIcon: {
    fontSize: 12,
  },
  encryptionText: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
});

import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { TripOption, formatPrice, formatDateRange } from "@corvax/shared";
import { theme } from "../../theme";
import { DemoBadge } from "../common/DemoBadge";

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
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState("");

  if (!option) return null;

  const hotel = option.hotels?.[0];
  const flight = option.flights?.[0];
  const dates = hotel ? formatDateRange(hotel.check_in, hotel.check_out) : "";
  const totalPriceFormatted = formatPrice(option.total_price, option.currency);

  const handleConfirm = () => {
    if (!agreed || loading) return;

    setLoading(true);
    setTimeout(() => {
      const generatedId = `OST-${Math.floor(100000 + Math.random() * 900000)}-DEMO`;
      setBookingId(generatedId);
      setLoading(false);
      setConfirmed(true);
      onConfirmSuccess?.(generatedId);
    }, 1000);
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
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sheet}>
            {/* Sheet Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Text style={styles.headerTitle}>Оформление поездки</Text>
                <DemoBadge variant="tint" label="Демо-режим" />
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                accessibilityLabel="Закрыть"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Demo Disclaimer */}
              <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerIcon}>ℹ️</Text>
                <View style={styles.disclaimerContent}>
                  <Text style={styles.disclaimerTitle}>Демонстрационный режим</Text>
                  <Text style={styles.disclaimerText}>
                    Все параметры смоделированы ИИ «О!дин запрос». Реальное списание средств не производится.
                  </Text>
                </View>
              </View>

              {/* Trip Parameters Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardCaption}>Параметры тура</Text>
                  {dates ? <Text style={styles.cardDates}>{dates}</Text> : null}
                </View>

                <Text style={styles.hotelTitle}>{hotel?.hotel || option.title}</Text>
                <Text style={styles.destinationSub}>
                  {option.destination} • Всё включено
                </Text>

                <View style={styles.divider} />

                <View style={styles.paramRow}>
                  <Text style={styles.paramIcon}>✈️</Text>
                  <Text style={styles.paramText}>
                    {flight ? `${flight.origin} ⇄ ${flight.destination} (${flight.carrier || "Авиа"})` : "Авиаперелёт включён"}
                  </Text>
                </View>

                <View style={styles.paramRow}>
                  <Text style={styles.paramIcon}>👥</Text>
                  <Text style={styles.paramText}>1 взрослый + 1 ребёнок (5 лет)</Text>
                </View>
              </View>

              {/* Traveler Information */}
              <View style={styles.card}>
                <Text style={styles.cardCaption}>Данные путешественника</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Основной турист</Text>
                  <Text style={styles.infoValue}>Алексей Смирнов</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Телефон для СМС</Text>
                  <Text style={styles.infoValue}>+7 (999) 456-78-90</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email (ваучер)</Text>
                  <Text style={styles.infoValue}>alex.smirnov@example.com</Text>
                </View>
              </View>

              {/* Cost Breakdown */}
              <View style={styles.card}>
                <Text style={styles.cardCaption}>Детализация стоимости</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.priceItemLabel}>Проживание и авиаперелёт</Text>
                  <Text style={styles.priceItemValue}>
                    {formatPrice(Math.round((option.total_price || 160000) * 0.9), option.currency)}
                  </Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceItemLabel}>Трансфер и топливный сбор</Text>
                  <Text style={styles.priceItemValue}>
                    {formatPrice(Math.round((option.total_price || 160000) * 0.1), option.currency)}
                  </Text>
                </View>

                <View style={styles.priceRow}>
                  <Text style={styles.priceItemLabel}>Сервисный сбор ИИ-подбора</Text>
                  <Text style={[styles.priceItemValue, { color: theme.colors.primary }]}>0 ₽</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <View>
                    <Text style={styles.totalLabel}>Итого к оплате</Text>
                    <Text style={styles.totalSub}>Демо-транзакция без сборов</Text>
                  </View>
                  <Text style={styles.totalValue}>{totalPriceFormatted}</Text>
                </View>
              </View>

              {/* Confirmation Checkbox */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.checkboxText}>
                  Я подтверждаю бронирование демонстрационного тура и согласен с правилами симуляции
                </Text>
              </TouchableOpacity>

              {/* Confirmation Success Toast */}
              {confirmed && (
                <View style={styles.successBox}>
                  <Text style={styles.successIcon}>🎉</Text>
                  <View style={styles.successTextCol}>
                    <Text style={styles.successTitle}>Бронирование подтверждено!</Text>
                    <Text style={styles.successSub}>
                      Номер брони: {bookingId}. Тестовый ваучер сохранён в сессии.
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  (!agreed || loading) && styles.ctaButtonDisabled,
                  confirmed && styles.ctaButtonSuccess,
                ]}
                onPress={confirmed ? handleClose : handleConfirm}
                disabled={!agreed || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.ctaButtonText}>
                    {confirmed
                      ? "Закрыть окно"
                      : `Подтвердить демо-бронь (${totalPriceFormatted}) →`}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  safeArea: {
    maxHeight: "90%",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: "hidden",
    maxHeight: "100%",
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
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.canvasMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  disclaimerBox: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.lg,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  disclaimerIcon: {
    fontSize: 16,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  disclaimerText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  hotelTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  destinationSub: {
    fontSize: 12,
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
    gap: 6,
  },
  paramIcon: {
    fontSize: 13,
  },
  paramText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  priceItemLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  priceItemValue: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  totalSub: {
    fontSize: 10,
    color: theme.colors.textTertiary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
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
    fontWeight: "700",
  },
  checkboxText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: "row",
    backgroundColor: "#DCFCE7",
    padding: 10,
    borderRadius: theme.borderRadius.md,
    gap: 8,
    alignItems: "center",
  },
  successIcon: {
    fontSize: 18,
  },
  successTextCol: {
    flex: 1,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
  },
  successSub: {
    fontSize: 11,
    color: "#15803D",
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 10,
    ...theme.shadows.md,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonSuccess: {
    backgroundColor: "#16A34A",
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

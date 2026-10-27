import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { Icon } from "../common/Icon";

export interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSavePreferences?: (city: string, currency: string) => void;
}

export const POPULAR_CITIES = [
  { id: "MOW", name: "Москва (MOW)" },
  { id: "LED", name: "Санкт-Петербург (LED)" },
  { id: "SVX", name: "Екатеринбург (SVX)" },
  { id: "KZN", name: "Казань (KZN)" },
  { id: "OVB", name: "Новосибирск (OVB)" },
  { id: "AER", name: "Сочи (AER)" },
];

export const POPULAR_CURRENCIES = [
  { code: "RUB", symbol: "₽", label: "Российский рубль" },
  { code: "USD", symbol: "$", label: "Доллар США" },
  { code: "EUR", symbol: "€", label: "Евро" },
  { code: "AED", symbol: "AED", label: "Дирхам ОАЭ" },
  { code: "TRY", symbol: "₺", label: "Турецкая лира" },
  { code: "GEL", symbol: "₾", label: "Грузинский лари" },
  { code: "KZT", symbol: "₸", label: "Казахстанский тенге" },
  { code: "BYN", symbol: "Br", label: "Белорусский рубль" },
  { code: "THB", symbol: "฿", label: "Тайский бат" },
  { code: "CNY", symbol: "¥", label: "Китайский юань" },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  onSavePreferences,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedCity, setSelectedCity] = useState("MOW");
  const [selectedCurrency, setSelectedCurrency] = useState("RUB");
  const [travelerName, setTravelerName] = useState("Иван Иванов");
  const [travelerPhone, setTravelerPhone] = useState("+7 (999) 123-45-67");
  const [travelerEmail, setTravelerEmail] = useState("ivan@example.com");
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    const cityName = POPULAR_CITIES.find((c) => c.id === selectedCity)?.name || "Москва";
    onSavePreferences?.(cityName, selectedCurrency);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
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
              <Text style={styles.headerTitle}>Настройки и профиль</Text>
              <Text style={styles.headerSub}>Параметры поиска и данные туриста</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
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
            {/* Preferred Departure City */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="plane" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Основной город вылета</Text>
              </View>

              <View style={styles.chipsGrid}>
                {POPULAR_CITIES.map((c) => {
                  const isSelected = selectedCity === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.cityChip, isSelected && styles.cityChipActive]}
                      onPress={() => setSelectedCity(c.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cityChipText,
                          isSelected && styles.cityChipTextActive,
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Currency Selector */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="sparkles" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Валюта отображения цен</Text>
              </View>

              <View style={styles.currencyList}>
                {POPULAR_CURRENCIES.map((cur) => {
                  const isSelected = selectedCurrency === cur.code;
                  return (
                    <TouchableOpacity
                      key={cur.code}
                      style={[styles.currencyRow, isSelected && styles.currencyRowActive]}
                      onPress={() => setSelectedCurrency(cur.code)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.currencyCodeCol}>
                        <Text style={styles.currencySymbol}>{cur.symbol}</Text>
                        <Text
                          style={[
                            styles.currencyName,
                            isSelected && styles.currencyNameActive,
                          ]}
                        >
                          {cur.label} ({cur.code})
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleActive,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Default Traveler Information */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="user" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Данные основного туриста</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>ФИО для бронирования</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={travelerName}
                  onChangeText={setTravelerName}
                  placeholder="Иван Иванов"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Телефон для СМС и ваучера</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={travelerPhone}
                  onChangeText={setTravelerPhone}
                  placeholder="+7 (999) 000-00-00"
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Электронная почта</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={travelerEmail}
                  onChangeText={setTravelerEmail}
                  placeholder="ivan@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Notification & Price Alerts */}
            <View style={styles.notificationRow}>
              <View style={styles.notificationTextCol}>
                <Text style={styles.notificationTitle}>Уведомления о снижении цен</Text>
                <Text style={styles.notificationSubtitle}>
                  Получать алерты при появлении горящих путевок по моим направлениям
                </Text>
              </View>
              <Switch
                value={priceAlerts}
                onValueChange={setPriceAlerts}
                trackColor={{ false: "#D1D5DB", true: "#E9D5FF" }}
                thumbColor={priceAlerts ? theme.colors.primary : "#F3F4F6"}
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, savedSuccess && styles.saveButtonSuccess]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {savedSuccess ? "✓ Настройки сохранены" : "Сохранить настройки"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

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
    maxHeight: "88%",
    overflow: "hidden",
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
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cityChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: "500",
  },
  cityChipTextActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  currencyList: {
    gap: 6,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: "transparent",
  },
  currencyRowActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  currencyCodeCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
    width: 28,
  },
  currencyName: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  currencyNameActive: {
    fontWeight: "700",
    color: theme.colors.primary,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: theme.colors.primary,
  },
  formGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  fieldInput: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  notificationTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  notificationSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    ...theme.shadows.md,
  },
  saveButtonSuccess: {
    backgroundColor: "#059669",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

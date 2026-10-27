import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  cityChipActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textPrimary,
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
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  currencyRowActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  currencyCodeCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  currencySymbol: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.primary,
    width: 28,
  },
  currencyName: {
    fontSize: 13,
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
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...theme.shadows.md,
  },
  saveButtonSuccess: {
    backgroundColor: "#047857",
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

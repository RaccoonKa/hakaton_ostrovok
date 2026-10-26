import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";

export interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSavePreferences?: (city: string) => void;
}

export const CITIES = [
  { id: "MOW", name: "Москва (DME/SVO/VKO)" },
  { id: "LED", name: "Санкт-Петербург (Пулково)" },
  { id: "KZN", name: "Казань (KZN)" },
  { id: "SVX", name: "Екатеринбург (Кольцово)" },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  onSavePreferences,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedCity, setSelectedCity] = useState("MOW");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [discountAlerts, setDiscountAlerts] = useState(true);

  const handleSave = () => {
    const cityName = CITIES.find((c) => c.id === selectedCity)?.name || "Москва";
    onSavePreferences?.(cityName);
    onClose();
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
            <Text style={styles.headerTitle}>Профиль путешественника</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
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
            {/* User Identity Card */}
            <View style={styles.userCard}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarLargeText}>👤</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>Алексей Смирнов</Text>
                <Text style={styles.userEmail}>alex.smirnov@example.com</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillDot}>●</Text>
                  <Text style={styles.statusPillText}>Аккаунт подтверждён</Text>
                </View>
              </View>
            </View>

            {/* Departure City Preference */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCaption}>Основной город вылета</Text>
              <View style={styles.cityList}>
                {CITIES.map((c) => {
                  const isSelected = selectedCity === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.cityRow, isSelected && styles.cityRowSelected]}
                      onPress={() => setSelectedCity(c.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.cityName,
                          isSelected && styles.cityNameSelected,
                        ]}
                      >
                        {c.name}
                      </Text>
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Notification & Currency Settings */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCaption}>Настройки сервиса</Text>

              <View style={styles.settingRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Push-уведомления</Text>
                  <Text style={styles.settingSub}>
                    Статусы рейсов и напоминания о вылете
                  </Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: "#D1D5DB", true: "#C7D2FE" }}
                  thumbColor={pushEnabled ? theme.colors.primary : "#F3F4F6"}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Снижение цен на отели</Text>
                  <Text style={styles.settingSub}>
                    Оповещать, если тур подешевеет на 15%+
                  </Text>
                </View>
                <Switch
                  value={discountAlerts}
                  onValueChange={setDiscountAlerts}
                  trackColor={{ false: "#D1D5DB", true: "#C7D2FE" }}
                  thumbColor={discountAlerts ? theme.colors.primary : "#F3F4F6"}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.settingRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingTitle}>Основная валюта</Text>
                  <Text style={styles.settingSub}>Российский рубль (₽)</Text>
                </View>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>RUB (₽)</Text>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Сохранить настройки</Text>
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
    overflow: "hidden",
    maxHeight: "88%",
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
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
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
    gap: 14,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
    ...theme.shadows.sm,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLargeText: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
    alignSelf: "flex-start",
    marginTop: 6,
    gap: 4,
  },
  statusPillDot: {
    fontSize: 6,
    color: "#16A34A",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
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
  sectionCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cityList: {
    gap: 6,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  cityRowSelected: {
    backgroundColor: theme.colors.surfaceContainer,
  },
  cityName: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  cityNameSelected: {
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
  radioCircleSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  settingTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  settingSub: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSubtle,
  },
  currencyBadge: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.md,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
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
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

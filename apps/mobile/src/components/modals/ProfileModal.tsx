import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, getTheme } from "../../theme";
import { Icon } from "../common/Icon";
import { AuthUser } from "@corvax/shared";

export interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onSavePreferences?: (city: string, currency: string) => void;
  backendUrl?: string;
  onUpdateBackendUrl?: (url: string) => void;
  isDark?: boolean;
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

export const SERVER_PRESETS = [
  { label: "Туннель", url: "https://strong-colts-own.loca.lt" },
  { label: "Wi-Fi LAN", url: "http://192.168.1.79:8080" },
  { label: "Эмулятор", url: "http://10.0.2.2:8080" },
  { label: "Localhost", url: "http://localhost:8080" },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  currentUser,
  onOpenAuth,
  onLogout,
  onSavePreferences,
  backendUrl,
  onUpdateBackendUrl,
  isDark = false,
}) => {
  const insets = useSafeAreaInsets();
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;
  const [selectedCity, setSelectedCity] = useState("MOW");
  const [selectedCurrency, setSelectedCurrency] = useState("RUB");

  const [editPassport, setEditPassport] = useState(currentUser?.passportNumber || "");
  const [editIntlPassport, setEditIntlPassport] = useState(currentUser?.intlPassport || "");

  const [serverUrl, setServerUrl] = useState(backendUrl || "https://strong-colts-own.loca.lt");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (backendUrl) {
      setServerUrl(backendUrl);
    }
  }, [backendUrl, visible]);

  const testConnection = async (testUrl?: string) => {
    const targetUrl = (testUrl || serverUrl).trim().replace(/\/$/, "");
    setConnectionStatus("testing");
    setStatusMessage("Проверка связи...");
    try {
      const res = await fetch(`${targetUrl}/health`, {
        headers: { "Bypass-Tunnel-Reminder": "true" },
      });
      if (res.ok) {
        setConnectionStatus("ok");
        setStatusMessage("✓ Сервер онлайн (200 OK)");
      } else {
        setConnectionStatus("error");
        setStatusMessage(`Ошибка сервера: ${res.status}`);
      }
    } catch {
      setConnectionStatus("error");
      setStatusMessage("✗ Сервер недоступен (проверьте URL)");
    }
  };

  const handleSelectPreset = (url: string) => {
    setServerUrl(url);
    if (onUpdateBackendUrl) {
      onUpdateBackendUrl(url);
    }
    testConnection(url);
  };

  const handleSave = () => {
    const cityName = POPULAR_CITIES.find((c) => c.id === selectedCity)?.name || "Москва";
    onSavePreferences?.(cityName, selectedCurrency);

    if (onUpdateBackendUrl && serverUrl.trim()) {
      onUpdateBackendUrl(serverUrl.trim().replace(/\/$/, ""));
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Modal Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBox, { backgroundColor: isDark ? colors.surfaceContainer : colors.primaryLight }]}>
                <Icon name="user" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Профиль и настройки</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Account Card */}
            {currentUser ? (
              <View style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>
                      {currentUser.fullName
                        ? currentUser.fullName
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        : "ПУ"}
                    </Text>
                  </View>
                  <View style={styles.profileInfoCol}>
                    <View style={styles.profileNameRow}>
                      <Text style={styles.profileName}>{currentUser.fullName}</Text>
                      <View style={styles.tierBadge}>
                        <Text style={styles.tierBadgeText}>{currentUser.tier}</Text>
                      </View>
                    </View>
                    <Text style={styles.profileEmail}>{currentUser.email}</Text>
                    {currentUser.phone ? (
                      <Text style={styles.profilePhone}>{currentUser.phone}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Passport details for fast checkout */}
                <View style={styles.passportSection}>
                  <Text style={styles.passportSectionTitle}>Документы для бронирования</Text>
                  <View style={styles.passportInputsRow}>
                    <View style={styles.passportInputCol}>
                      <Text style={styles.passportInputLabel}>Паспорт РФ</Text>
                      <TextInput
                        style={styles.passportInput}
                        value={editPassport}
                        onChangeText={setEditPassport}
                        placeholder="Серия и номер"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                    <View style={styles.passportInputCol}>
                      <Text style={styles.passportInputLabel}>Загранпаспорт</Text>
                      <TextInput
                        style={styles.passportInput}
                        value={editIntlPassport}
                        onChangeText={setEditIntlPassport}
                        placeholder="Серия и номер"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                    </View>
                  </View>
                </View>

                {onLogout && (
                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={() => {
                      onLogout();
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="arrow-left" size={15} color="#DC2626" />
                    <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.unauthCard}>
                <View style={styles.unauthIconBox}>
                  <Icon name="user" size={28} color={theme.colors.primary} />
                </View>
                <Text style={styles.unauthTitle}>Личный кабинет путешественника</Text>
                <Text style={styles.unauthSubtitle}>
                  Авторизуйтесь, чтобы сохранять историю диалогов и быстрее бронировать найденные туры.
                </Text>
                <TouchableOpacity
                  style={styles.loginActionBtn}
                  onPress={() => {
                    onClose();
                    onOpenAuth?.();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.loginActionBtnText}>Войти или зарегистрироваться</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Backend Connection */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="refresh" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Подключение к серверу ИИ</Text>
              </View>
              <Text style={styles.sectionHint}>
                Выберите пресет или введите адрес FastAPI бэкенда:
              </Text>

              <View style={styles.presetButtonsRow}>
                {SERVER_PRESETS.map((p) => {
                  const isActive = serverUrl === p.url;
                  return (
                    <TouchableOpacity
                      key={p.label}
                      style={[styles.presetButton, isActive && styles.presetButtonActive]}
                      onPress={() => handleSelectPreset(p.url)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.presetButtonText,
                          isActive && styles.presetButtonTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.serverInputRow}>
                <TextInput
                  style={[styles.fieldInput, styles.serverInput]}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="http://192.168.1.79:8080"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TouchableOpacity
                  style={[
                    styles.testButton,
                    connectionStatus === "ok" && styles.testButtonOk,
                    connectionStatus === "error" && styles.testButtonError,
                  ]}
                  onPress={() => testConnection()}
                  disabled={connectionStatus === "testing"}
                  activeOpacity={0.8}
                >
                  {connectionStatus === "testing" ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.testButtonText}>Тест</Text>
                  )}
                </TouchableOpacity>
              </View>

              {statusMessage ? (
                <Text
                  style={[
                    styles.statusMessageText,
                    connectionStatus === "ok" && styles.statusMessageOk,
                    connectionStatus === "error" && styles.statusMessageError,
                  ]}
                >
                  {statusMessage}
                </Text>
              ) : null}
            </View>

            {/* Departure City */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="plane" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Город вылета по умолчанию</Text>
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
                      <Text style={[styles.cityChipText, isSelected && styles.cityChipTextActive]}>
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
                <Text style={styles.sectionTitle}>Валюта цен</Text>
              </View>
              <View style={styles.currencyList}>
                {POPULAR_CURRENCIES.slice(0, 5).map((cur) => {
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
                        <Text style={[styles.currencyName, isSelected && styles.currencyNameActive]}>
                          {cur.label} ({cur.code})
                        </Text>
                      </View>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, savedSuccess && styles.saveButtonSuccess]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>
                {savedSuccess ? "✓ Настройки сохранены" : "Сохранить параметры"}
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
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: "90%",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 14,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  profileInfoCol: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  tierBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  profileEmail: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  profilePhone: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  passportSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 12,
    gap: 8,
  },
  passportSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  passportInputsRow: {
    flexDirection: "row",
    gap: 10,
  },
  passportInputCol: {
    flex: 1,
    gap: 4,
  },
  passportInputLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  passportInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
  unauthCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  unauthIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  unauthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  unauthSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 6,
  },
  loginActionBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loginActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  sectionHint: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  presetButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
  },
  presetButtonActive: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  presetButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  presetButtonTextActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  serverInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  serverInput: {
    flex: 1,
  },
  testButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  testButtonOk: {
    backgroundColor: "#16A34A",
  },
  testButtonError: {
    backgroundColor: "#DC2626",
  },
  testButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  statusMessageText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  statusMessageOk: {
    color: "#16A34A",
  },
  statusMessageError: {
    color: "#DC2626",
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  cityChipActive: {
    backgroundColor: theme.colors.primary,
  },
  cityChipText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  cityChipTextActive: {
    color: "#FFFFFF",
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
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  currencyRowActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  currencyCodeCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
    width: 24,
  },
  currencyName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  currencyNameActive: {
    color: theme.colors.primary,
    fontWeight: "700",
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
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveButtonSuccess: {
    backgroundColor: "#16A34A",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

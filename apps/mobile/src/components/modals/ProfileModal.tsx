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
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { Icon } from "../common/Icon";
import { UserAccount } from "../../types/account";

export interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  accounts?: UserAccount[];
  activeAccountId?: string;
  onSelectAccount?: (id: string) => void;
  onUpdateAccount?: (account: UserAccount) => void;
  onCreateAccount?: (account: UserAccount) => void;
  onSavePreferences?: (city: string, currency: string) => void;
  backendUrl?: string;
  onUpdateBackendUrl?: (url: string) => void;
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
  { label: "Wi-Fi LAN", url: "http://192.168.1.79:8000" },
  { label: "Туннель", url: "https://famous-bars-glow.loca.lt" },
  { label: "Эмулятор", url: "http://10.0.2.2:8000" },
  { label: "Localhost", url: "http://localhost:8000" },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  accounts = [],
  activeAccountId = "acc-1",
  onSelectAccount,
  onUpdateAccount,
  onCreateAccount,
  onSavePreferences,
  backendUrl,
  onUpdateBackendUrl,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedCity, setSelectedCity] = useState("MOW");
  const [selectedCurrency, setSelectedCurrency] = useState("RUB");

  const currentAcc = accounts.find((a) => a.id === activeAccountId) || accounts[0];

  const [editName, setEditName] = useState(currentAcc?.name || "Алексей Смирнов");
  const [editPhone, setEditPhone] = useState(currentAcc?.phone || "+7 (999) 123-45-67");
  const [editEmail, setEditEmail] = useState(currentAcc?.email || "alexey.smirnov@example.com");
  const [editPassport, setEditPassport] = useState(currentAcc?.passportNumber || "4512 789123");
  const [editIntlPassport, setEditIntlPassport] = useState(currentAcc?.intlPassport || "75 №1234567");

  const [serverUrl, setServerUrl] = useState(backendUrl || "http://192.168.1.79:8000");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (currentAcc) {
      setEditName(currentAcc.name);
      setEditPhone(currentAcc.phone);
      setEditEmail(currentAcc.email);
      setEditPassport(currentAcc.passportNumber || "");
      setEditIntlPassport(currentAcc.intlPassport || "");
    }
  }, [currentAcc?.id, visible]);

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
    if (currentAcc && onUpdateAccount) {
      onUpdateAccount({
        ...currentAcc,
        name: editName.trim() || currentAcc.name,
        phone: editPhone.trim() || currentAcc.phone,
        email: editEmail.trim() || currentAcc.email,
        passportNumber: editPassport.trim() || currentAcc.passportNumber,
        intlPassport: editIntlPassport.trim() || currentAcc.intlPassport,
        avatarInitials:
          editName
            .trim()
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || currentAcc.avatarInitials,
      });
    }

    const cityName = POPULAR_CITIES.find((c) => c.id === selectedCity)?.name || "Москва";
    onSavePreferences?.(cityName, selectedCurrency);

    if (onUpdateBackendUrl && serverUrl.trim()) {
      onUpdateBackendUrl(serverUrl.trim().replace(/\/$/, ""));
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  const handleAddNewAccount = () => {
    if (!onCreateAccount) return;
    const newId = `acc-${Date.now()}`;
    const newAcc: UserAccount = {
      id: newId,
      name: "Новый путешественник",
      email: "guest@example.com",
      phone: "+7 (999) 000-00-00",
      tier: "Базовый",
      bonusMiles: 1000,
      avatarInitials: "НП",
      badgeColor: "#6B7280",
    };
    onCreateAccount(newAcc);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerTitle}>Аккаунт и настройки</Text>
              <Text style={styles.headerSub}>Управление профилями и сервером ИИ</Text>
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
            {/* Accounts Manager Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="user" size={15} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Рабочие аккаунты</Text>
              </View>

              {/* Account Switcher Carousel */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.accountListScroll}
              >
                {accounts.map((acc) => {
                  const isActive = acc.id === (currentAcc?.id || activeAccountId);
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accountCard,
                        isActive && styles.accountCardActive,
                      ]}
                      onPress={() => onSelectAccount?.(acc.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.avatarBadge,
                          { backgroundColor: acc.badgeColor || theme.colors.primary },
                        ]}
                      >
                        <Text style={styles.avatarInitials}>{acc.avatarInitials}</Text>
                      </View>
                      <Text style={styles.accountCardName} numberOfLines={1}>
                        {acc.name}
                      </Text>
                      <View style={styles.accountBadgeRow}>
                        <Text style={styles.accountTierText}>{acc.tier}</Text>
                        <Text style={styles.accountMilesText}>
                          {acc.bonusMiles.toLocaleString("ru-RU")} миль
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.addAccountButton}
                  onPress={handleAddNewAccount}
                  activeOpacity={0.7}
                >
                  <Icon name="sparkles" size={16} color={theme.colors.primary} />
                  <Text style={styles.addAccountText}>+ Профиль</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Active Profile Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Имя и фамилия</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Имя Фамилия"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Номер телефона</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+7 (999) 000-00-00"
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Электронная почта</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Паспорт РФ</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editPassport}
                    onChangeText={setEditPassport}
                    placeholder="Серия и номер"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Загранпаспорт</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={editIntlPassport}
                    onChangeText={setEditIntlPassport}
                    placeholder="Номер паспорта"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Backend Connection */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="compass" size={15} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Сервер планирования (ИИ)</Text>
              </View>

              <Text style={styles.serverHintText}>
                Выберите быстрый пресет подключения или укажите свой адрес:
              </Text>

              {/* Preset Buttons */}
              <View style={styles.presetsRow}>
                {SERVER_PRESETS.map((preset) => {
                  const isCurrent = serverUrl.includes(preset.url.replace(/^https?:\/\//, ""));
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, isCurrent && styles.presetChipActive]}
                      onPress={() => handleSelectPreset(preset.url)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetChipText, isCurrent && styles.presetChipTextActive]}>
                        {preset.label}
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
                  placeholder="http://192.168.1.79:8000"
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
                    <Text style={styles.testButtonText}>Проверить</Text>
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
                <Text style={styles.sectionTitle}>Город вылета</Text>
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
          </ScrollView>

          {/* Footer Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveBtn, savedSuccess && styles.saveBtnSuccess]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Icon
                name={savedSuccess ? "check" : "check"}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.saveBtnText}>
                {savedSuccess ? "Сохранено" : "Сохранить параметры"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: "90%",
    ...theme.shadows.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    maxHeight: 520,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    gap: 12,
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
  accountListScroll: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  accountCard: {
    width: 140,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1.5,
    borderColor: theme.colors.borderSubtle,
    gap: 6,
  },
  accountCardActive: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderColor: theme.colors.primary,
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  accountCardName: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  accountBadgeRow: {
    flexDirection: "column",
    gap: 2,
  },
  accountTierText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  accountMilesText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  addAccountButton: {
    width: 90,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addAccountText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  formGroup: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  fieldInput: {
    height: 42,
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    fontSize: 13,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  serverHintText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    lineHeight: 16,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  presetChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  presetChipTextActive: {
    color: "#FFFFFF",
  },
  serverInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  serverInput: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
  },
  testButton: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  testButtonOk: {
    backgroundColor: "#059669",
  },
  testButtonError: {
    backgroundColor: "#DC2626",
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statusMessageText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  statusMessageOk: {
    color: "#059669",
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
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  cityChipActive: {
    backgroundColor: theme.colors.headerBg,
    borderColor: theme.colors.headerBg,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  cityChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  currencyList: {
    gap: 8,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainer,
  },
  currencyRowActive: {
    backgroundColor: theme.colors.surfaceContainerHigh,
  },
  currencyCodeCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  currencySymbol: {
    width: 28,
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.primary,
    textAlign: "center",
  },
  currencyName: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: "500",
  },
  currencyNameActive: {
    fontWeight: "700",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.borderSubtle,
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
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  saveBtn: {
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnSuccess: {
    backgroundColor: "#059669",
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

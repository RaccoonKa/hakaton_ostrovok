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
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, getTheme } from "../../theme";
import { Icon } from "../common/Icon";
import { AuthUser } from "@corvax/shared";

export interface MobilePreferences {
  currency: string;
  homeCity: string;
  directFlightsOnly: boolean;
  withLuggage: boolean;
  minHotelRating: number;
}

export const DEFAULT_MOBILE_PREFERENCES: MobilePreferences = {
  currency: "RUB",
  homeCity: "Москва (MOW)",
  directFlightsOnly: true,
  withLuggage: true,
  minHotelRating: 4,
};

export interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: "search" | "account";
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  preferences?: MobilePreferences;
  onSavePreferences?: (prefs: MobilePreferences) => void;
  backendUrl?: string;
  onUpdateBackendUrl?: (url: string) => void;
  isDark?: boolean;
}

export const POPULAR_CITIES = [
  "Москва (MOW)",
  "Санкт-Петербург (LED)",
  "Екатеринбург (SVX)",
  "Казань (KZN)",
  "Новосибирск (OVB)",
  "Сочи (AER)",
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
  { code: "AMD", symbol: "֏", label: "Армянский драм" },
  { code: "EGP", symbol: "E£", label: "Египетский фунт" },
];

export const HOTEL_RATING_OPTIONS = [
  { rating: 0, label: "Любая" },
  { rating: 3, label: "3★+" },
  { rating: 4, label: "4★+" },
  { rating: 5, label: "5★ Luxe" },
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
  initialTab = "account",
  currentUser,
  onOpenAuth,
  onLogout,
  preferences = DEFAULT_MOBILE_PREFERENCES,
  onSavePreferences,
  backendUrl,
  onUpdateBackendUrl,
  isDark = false,
}) => {
  const insets = useSafeAreaInsets();
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const [activeTab, setActiveTab] = useState<"search" | "account">(initialTab);
  const [draftPrefs, setDraftPrefs] = useState<MobilePreferences>(preferences);
  const [customCityInput, setCustomCityInput] = useState("");

  const [serverUrl, setServerUrl] = useState(backendUrl || "https://strong-colts-own.loca.lt");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setDraftPrefs(preferences);
      setSavedSuccess(false);
      if (backendUrl) {
        setServerUrl(backendUrl);
      }
    }
  }, [visible, initialTab, preferences, backendUrl]);

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

  const handleSaveSearchSettings = () => {
    const finalCity = customCityInput.trim() ? customCityInput.trim() : draftPrefs.homeCity;
    const finalPrefs: MobilePreferences = {
      ...draftPrefs,
      homeCity: finalCity,
    };
    setDraftPrefs(finalPrefs);
    onSavePreferences?.(finalPrefs);

    if (onUpdateBackendUrl && serverUrl.trim()) {
      onUpdateBackendUrl(serverUrl.trim().replace(/\/$/, ""));
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 500);
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

          {/* Modal Header Tabs */}
          <View
            style={[
              styles.headerTabsBar,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View style={styles.tabButtonsGroup}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "search" && [
                    styles.tabButtonActive,
                    {
                      backgroundColor: isDark ? "rgba(139, 92, 246, 0.18)" : "#EDE9FE",
                      borderColor: colors.primary,
                    },
                  ],
                ]}
                onPress={() => setActiveTab("search")}
                activeOpacity={0.7}
              >
                <Icon
                  name="sliders"
                  size={14}
                  color={activeTab === "search" ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: activeTab === "search" ? colors.primary : colors.textSecondary },
                    activeTab === "search" && styles.tabButtonTextActive,
                  ]}
                >
                  Параметры поиска
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === "account" && [
                    styles.tabButtonActive,
                    {
                      backgroundColor: isDark ? "rgba(139, 92, 246, 0.18)" : "#EDE9FE",
                      borderColor: colors.primary,
                    },
                  ],
                ]}
                onPress={() => setActiveTab("account")}
                activeOpacity={0.7}
              >
                <Icon
                  name="user"
                  size={14}
                  color={activeTab === "account" ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: activeTab === "account" ? colors.primary : colors.textSecondary },
                    activeTab === "account" && styles.tabButtonTextActive,
                  ]}
                >
                  Профиль
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Icon name="close" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === "search" ? (
              /* TAB 1: Search Parameters & Preferences */
              <View style={styles.tabContentContainer}>
                {/* 1. Currency Selector */}
                <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Icon name="sparkles" size={15} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Валюта цен</Text>
                  </View>
                  <View style={styles.currencyGrid}>
                    {POPULAR_CURRENCIES.map((cur) => {
                      const isSelected = draftPrefs.currency === cur.code;
                      return (
                        <TouchableOpacity
                          key={cur.code}
                          style={[
                            styles.currencyCard,
                            {
                              backgroundColor: isSelected
                                ? isDark ? "rgba(139, 92, 246, 0.22)" : "#EDE9FE"
                                : isDark ? colors.surfaceContainer : colors.canvasMuted,
                              borderColor: isSelected ? colors.primary : colors.borderSubtle,
                            },
                          ]}
                          onPress={() => setDraftPrefs((p) => ({ ...p, currency: cur.code }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.currencySymbol, isSelected && { color: colors.primary }]}>
                            {cur.symbol}
                          </Text>
                          <View style={styles.currencyTextCol}>
                            <Text
                              style={[
                                styles.currencyCodeText,
                                { color: isSelected ? colors.primary : colors.textPrimary },
                              ]}
                            >
                              {cur.code}
                            </Text>
                            <Text
                              style={[
                                styles.currencyLabelText,
                                { color: isSelected ? colors.primary : colors.textMuted },
                              ]}
                              numberOfLines={1}
                            >
                              {cur.label}
                            </Text>
                          </View>
                          {isSelected && <Icon name="check" size={13} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 2. Departure City */}
                <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Icon name="plane" size={15} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Город вылета по умолчанию</Text>
                  </View>
                  <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                    Текущий: {draftPrefs.homeCity}
                  </Text>

                  <View style={styles.chipsGrid}>
                    {POPULAR_CITIES.map((city) => {
                      const isSelected = draftPrefs.homeCity === city;
                      return (
                        <TouchableOpacity
                          key={city}
                          style={[
                            styles.cityChip,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : isDark ? colors.surfaceContainer : colors.canvasMuted,
                              borderColor: isSelected ? colors.primary : colors.borderSubtle,
                            },
                          ]}
                          onPress={() => {
                            setDraftPrefs((p) => ({ ...p, homeCity: city }));
                            setCustomCityInput("");
                          }}
                          activeOpacity={0.7}
                        >
                          {isSelected && <Icon name="check" size={12} color="#FFFFFF" />}
                          <Text
                            style={[
                              styles.cityChipText,
                              { color: isSelected ? "#FFFFFF" : colors.textPrimary },
                            ]}
                          >
                            {city}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    style={[
                      styles.cityCustomInput,
                      {
                        backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                        color: colors.textPrimary,
                        borderColor: colors.borderSubtle,
                      },
                    ]}
                    value={customCityInput}
                    onChangeText={setCustomCityInput}
                    placeholder="Другой город (например, Казань или Сочи)..."
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* 3. Flight & Hotel Preferences */}
                <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Icon name="briefcase" size={15} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      Предпочтения перелётов и отелей
                    </Text>
                  </View>

                  {/* Direct flights */}
                  <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.switchTextCol}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Только прямые перелёты
                      </Text>
                      <Text style={[styles.switchSubtitle, { color: colors.textMuted }]}>
                        Исключать рейсы с длительными пересадками
                      </Text>
                    </View>
                    <Switch
                      value={draftPrefs.directFlightsOnly}
                      onValueChange={(val) =>
                        setDraftPrefs((p) => ({ ...p, directFlightsOnly: val }))
                      }
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Luggage included */}
                  <View style={[styles.switchRow, { borderBottomColor: colors.borderSubtle }]}>
                    <View style={styles.switchTextCol}>
                      <Text style={[styles.switchTitle, { color: colors.textPrimary }]}>
                        Багаж всегда включён
                      </Text>
                      <Text style={[styles.switchSubtitle, { color: colors.textMuted }]}>
                        Подбирать тарифы с багажом от 20 кг
                      </Text>
                    </View>
                    <Switch
                      value={draftPrefs.withLuggage}
                      onValueChange={(val) =>
                        setDraftPrefs((p) => ({ ...p, withLuggage: val }))
                      }
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  {/* Min hotel rating */}
                  <View style={styles.ratingRow}>
                    <Text style={[styles.ratingTitle, { color: colors.textPrimary }]}>
                      Категория отеля по умолчанию
                    </Text>
                    <View style={styles.ratingButtonsGroup}>
                      {HOTEL_RATING_OPTIONS.map((opt) => {
                        const isSelected = draftPrefs.minHotelRating === opt.rating;
                        return (
                          <TouchableOpacity
                            key={opt.rating}
                            style={[
                              styles.ratingButton,
                              {
                                backgroundColor: isSelected
                                  ? colors.primary
                                  : isDark ? colors.surfaceContainer : colors.canvasMuted,
                                borderColor: isSelected ? colors.primary : colors.borderSubtle,
                              },
                            ]}
                            onPress={() =>
                              setDraftPrefs((p) => ({ ...p, minHotelRating: opt.rating }))
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.ratingButtonText,
                                { color: isSelected ? "#FFFFFF" : colors.textPrimary },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>

                {/* 4. Backend Connection Settings */}
                <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Icon name="refresh" size={14} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Подключение к серверу ИИ</Text>
                  </View>
                  <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                    Выберите пресет или введите адрес FastAPI бэкенда:
                  </Text>

                  <View style={styles.presetButtonsRow}>
                    {SERVER_PRESETS.map((p) => {
                      const isActive = serverUrl === p.url;
                      return (
                        <TouchableOpacity
                          key={p.label}
                          style={[
                            styles.presetButton,
                            isActive && styles.presetButtonActive,
                          ]}
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
                      style={[
                        styles.fieldInput,
                        styles.serverInput,
                        {
                          backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                          color: colors.textPrimary,
                          borderColor: colors.borderSubtle,
                        },
                      ]}
                      value={serverUrl}
                      onChangeText={setServerUrl}
                      placeholder="http://192.168.1.79:8080"
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholderTextColor={colors.textMuted}
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

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveButton, savedSuccess && styles.saveButtonSuccess]}
                  onPress={handleSaveSearchSettings}
                  activeOpacity={0.85}
                >
                  <Icon name={savedSuccess ? "check" : "sliders"} size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {savedSuccess ? "Настройки сохранены!" : "Сохранить параметры"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* TAB 2: User Profile & Account Details (Real Backend Data) */
              <View style={styles.tabContentContainer}>
                {currentUser && !currentUser.isGuest ? (
                  <>
                    {/* Header Purple Gradient Banner (No fake badges) */}
                    <View style={styles.profileBanner}>
                      <View style={styles.profileAvatarBox}>
                        <Text style={styles.profileAvatarText}>
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
                      <View style={styles.profileBannerTextCol}>
                        <Text style={styles.profileBannerName} numberOfLines={1}>
                          {currentUser.fullName}
                        </Text>
                        <Text style={styles.profileBannerEmail} numberOfLines={1}>
                          {currentUser.email}
                        </Text>
                      </View>
                    </View>

                    {/* Profile Fields matching Web */}
                    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.sectionHeaderRow}>
                        <Icon name="shield" size={15} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Данные профиля</Text>
                      </View>

                      <View style={styles.profileFieldsGrid}>
                        {/* 1. Name */}
                        <View
                          style={[
                            styles.profileFieldCard,
                            {
                              backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                        >
                          <Text style={[styles.profileFieldLabel, { color: colors.textMuted }]}>
                            Имя пользователя
                          </Text>
                          <View style={styles.profileFieldValueRow}>
                            <Icon name="user" size={14} color={colors.textSecondary} />
                            <Text
                              style={[styles.profileFieldValueText, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {currentUser.fullName || "—"}
                            </Text>
                          </View>
                        </View>

                        {/* 2. Email */}
                        <View
                          style={[
                            styles.profileFieldCard,
                            {
                              backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                        >
                          <Text style={[styles.profileFieldLabel, { color: colors.textMuted }]}>
                            Электронная почта
                          </Text>
                          <View style={styles.profileFieldValueRow}>
                            <Icon name="mail" size={14} color={colors.textSecondary} />
                            <Text
                              style={[styles.profileFieldValueText, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {currentUser.email || "—"}
                            </Text>
                          </View>
                        </View>

                        {/* 3. Phone */}
                        <View
                          style={[
                            styles.profileFieldCard,
                            {
                              backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                        >
                          <Text style={[styles.profileFieldLabel, { color: colors.textMuted }]}>
                            Телефон
                          </Text>
                          <View style={styles.profileFieldValueRow}>
                            <Icon name="phone" size={14} color={colors.textSecondary} />
                            <Text
                              style={[styles.profileFieldValueText, { color: colors.textPrimary }]}
                              numberOfLines={1}
                            >
                              {currentUser.phone || "Не указан"}
                            </Text>
                          </View>
                        </View>

                        {/* 4. User ID */}
                        <View
                          style={[
                            styles.profileFieldCard,
                            {
                              backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                              borderColor: colors.borderSubtle,
                            },
                          ]}
                        >
                          <Text style={[styles.profileFieldLabel, { color: colors.textMuted }]}>
                            ID пользователя
                          </Text>
                          <View style={styles.profileFieldValueRow}>
                            <Icon name="briefcase" size={14} color={colors.textSecondary} />
                            <Text
                              style={[styles.profileFieldIdText, { color: colors.textSecondary }]}
                              numberOfLines={1}
                            >
                              {currentUser.id}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Logout Button */}
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
                  </>
                ) : (
                  /* Unauthenticated guest state matching Web */
                  <View
                    style={[
                      styles.unauthCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.unauthIconBox,
                        { backgroundColor: isDark ? colors.surfaceContainer : colors.primaryLight },
                      ]}
                    >
                      <Icon name="user" size={30} color={colors.primary} />
                    </View>
                    <Text style={[styles.unauthTitle, { color: colors.textPrimary }]}>
                      Личный кабинет путешественника
                    </Text>
                    <Text style={[styles.unauthSubtitle, { color: colors.textSecondary }]}>
                      Авторизуйтесь, чтобы сохранять историю диалогов на сервере и синхронизировать поездки.
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
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  sheet: {
    width: "100%",
    height: "85%",
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  headerTabsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabButtonActive: {
    borderWidth: 1,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  tabContentContainer: {
    gap: 16,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  currencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  currencyCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: "800",
    color: "#7E22CE",
    width: 22,
    textAlign: "center",
  },
  currencyTextCol: {
    flex: 1,
    marginLeft: 6,
  },
  currencyCodeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  currencyLabelText: {
    fontSize: 10,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  cityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  cityChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cityCustomInput: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  switchSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  ratingRow: {
    paddingTop: 12,
  },
  ratingTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  ratingButtonsGroup: {
    flexDirection: "row",
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  ratingButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  presetButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
  },
  presetButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  presetButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  presetButtonTextActive: {
    color: "#FFFFFF",
  },
  serverInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  fieldInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  serverInput: {
    fontFamily: undefined,
  },
  testButton: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  testButtonOk: {
    backgroundColor: "#10B981",
  },
  testButtonError: {
    backgroundColor: "#EF4444",
  },
  testButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  statusMessageText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
  },
  statusMessageOk: {
    color: "#10B981",
  },
  statusMessageError: {
    color: "#EF4444",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
  },
  saveButtonSuccess: {
    backgroundColor: "#10B981",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  profileBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#581C87",
    gap: 14,
  },
  profileAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  profileAvatarText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  profileBannerTextCol: {
    flex: 1,
  },
  profileBannerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileBannerEmail: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  profileFieldsGrid: {
    gap: 10,
    marginTop: 10,
  },
  profileFieldCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileFieldLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
  },
  profileFieldValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profileFieldValueText: {
    fontSize: 13,
    fontWeight: "600",
  },
  profileFieldIdText: {
    fontSize: 12,
    fontFamily: undefined,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.25)",
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    marginTop: 4,
  },
  logoutButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  unauthCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    textAlign: "center",
  },
  unauthIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  unauthTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  unauthSubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  loginActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#581C87",
  },
  loginActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

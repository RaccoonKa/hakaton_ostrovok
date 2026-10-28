import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme, getTheme } from "../../theme";
import { Icon } from "../common/Icon";
import { ClientAuthManager, AuthSession, AuthRateLimitError } from "@corvax/shared";
import { getDefaultBackendUrl } from "../../hooks/useMobileAgent";

export interface MobileAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onAuthSuccess: (session: AuthSession) => void;
  isDark?: boolean;
  baseUrl?: string;
}

export const AuthModal: React.FC<MobileAuthModalProps> = ({
  visible,
  onClose,
  onAuthSuccess,
  isDark = false,
  baseUrl,
}) => {
  const insets = useSafeAreaInsets();
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;
  const [tab, setTab] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async () => {
    if (cooldown > 0) return;
    setError(null);
    setIsLoading(true);

    const effectiveBaseUrl = baseUrl || getDefaultBackendUrl();

    try {
      if (tab === "login") {
        if (!email.trim() || !password.trim()) {
          throw new Error("Заполните email и пароль");
        }
        const session = await ClientAuthManager.login(
          {
            email: email.trim(),
            password,
          },
          effectiveBaseUrl
        );
        onAuthSuccess(session);
        onClose();
      } else {
        if (!fullName.trim()) {
          throw new Error("Укажите ваше имя");
        }
        if (!email.trim() || !password.trim()) {
          throw new Error("Укажите email и пароль");
        }
        if (password.length < 6) {
          throw new Error("Пароль должен быть от 6 символов");
        }
        const session = await ClientAuthManager.register(
          {
            fullName: fullName.trim(),
            email: email.trim(),
            password,
            phone: phone.trim() || undefined,
          },
          effectiveBaseUrl
        );
        onAuthSuccess(session);
        onClose();
      }
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
    } catch (err: unknown) {
      if (err instanceof AuthRateLimitError || (err as any)?.status === 429) {
        setCooldown(60);
        setError("Слишком много попыток входа (лимит 5 в минуту). Пожалуйста, подождите 60 секунд.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Не удалось выполнить авторизацию");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>О!</Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {tab === "login" ? "Вход в аккаунт" : "Регистрация"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: colors.surfaceContainer }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceContainer }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                tab === "login" && { backgroundColor: colors.surface, elevation: 1 },
              ]}
              onPress={() => {
                setTab("login");
                setError(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: tab === "login" ? theme.colors.primary : colors.textSecondary,
                    fontWeight: tab === "login" ? "700" : "500",
                  },
                ]}
              >
                Вход
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                tab === "register" && { backgroundColor: colors.surface, elevation: 1 },
              ]}
              onPress={() => {
                setTab("register");
                setError(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: tab === "register" ? theme.colors.primary : colors.textSecondary,
                    fontWeight: tab === "register" ? "700" : "500",
                  },
                ]}
              >
                Регистрация
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
            {error && (
              <View style={styles.errorBox}>
                <Icon name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {cooldown > 0 && (
              <View style={styles.cooldownBox}>
                <Icon name="clock" size={16} color="#D97706" />
                <Text style={styles.cooldownText}>
                  Повторная попытка будет доступна через {cooldown} сек.
                </Text>
              </View>
            )}

            {tab === "register" && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Имя и фамилия</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Константин Константинопольский"
                  placeholderTextColor={theme.colors.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceContainer,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="traveler@example.com"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {tab === "register" && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Телефон (необязательно)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceContainer,
                      color: colors.textPrimary,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="+7 (999) 000-00-00"
                  placeholderTextColor={theme.colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Пароль</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceContainer,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={tab === "register" ? "Минимум 6 символов" : "••••••••"}
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (isLoading || cooldown > 0) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || cooldown > 0}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {cooldown > 0
                    ? `Подождите ${cooldown} сек.`
                    : tab === "login"
                    ? "Войти в аккаунт"
                    : "Зарегистрироваться"}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Все текущие диалоги и найденные туры автоматически сохранятся в вашем профиле после авторизации.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
  },
  form: {
    marginBottom: 8,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  cooldownBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  cooldownText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  footerNote: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
});

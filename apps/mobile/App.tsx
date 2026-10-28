import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  useColorScheme,
  Appearance,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  SHARED_SUGGESTIONS,
  TripOption,
  ClientAuthManager,
  AuthSession,
  STORAGE_AUTH_TOKEN_KEY,
  STORAGE_USER_KEY,
  LEGACY_STORAGE_CURRENT_SESSION_KEY,
} from "@corvax/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme, lightColors, darkColors, getTheme, setAppTheme } from "./src/theme";
import { Icon, IconName } from "./src/components/common/Icon";
import { Header } from "./src/components/common/Header";
import { ChatMessageItem } from "./src/components/chat/ChatMessageItem";
import { ChatInputBar } from "./src/components/chat/ChatInputBar";
import { ThinkingBubble } from "./src/components/chat/ThinkingBubble";
import { TripCardMobile } from "./src/components/cards/TripCardMobile";
import { TripDossierView } from "./src/components/cards/TripDossierView";
import { BookingCheckoutModal } from "./src/components/modals/DemoCheckoutModal";
import { SidebarDrawer } from "./src/components/drawer/SidebarDrawer";
import { ProfileModal } from "./src/components/modals/ProfileModal";
import { AuthModal } from "./src/components/modals/AuthModal";
import { TravelFiltersModal } from "./src/components/modals/TravelFiltersModal";
import { useMobileAgent } from "./src/hooks/useMobileAgent";

const STORAGE_THEME_KEY = "odin_mobile_theme_v1";

const mobileMemoryCache = new Map<string, string>();
ClientAuthManager.setStorageAdapter({
  getItem: (key: string) => mobileMemoryCache.get(key) ?? null,
  setItem: (key: string, value: string) => {
    mobileMemoryCache.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  removeItem: (key: string) => {
    mobileMemoryCache.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
});

function getSuggestionIcon(text: string): IconName {
  const lower = text.toLowerCase();
  if (lower.includes("море") || lower.includes("пляж") || lower.includes("июле")) {
    return "sun";
  }
  if (lower.includes("лыжи") || lower.includes("сочи") || lower.includes("январе")) {
    return "mountain";
  }
  if (lower.includes("стамбул") || lower.includes("отель") || lower.includes("тур")) {
    return "building";
  }
  return "sparkles";
}

function MainApp() {
  const [inputText, setInputText] = useState("");
  const [historyVisible, setHistoryVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);

  // System OS color scheme auto-detection
  const systemColorScheme = useColorScheme();
  const [manualTheme, setManualTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_THEME_KEY);
        if (saved === "light" || saved === "dark") {
          setManualTheme(saved);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Listen to system Appearance changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (!manualTheme) {
        setAppTheme(colorScheme === "dark");
      }
    });
    return () => subscription.remove();
  }, [manualTheme]);

  // Effective theme: manual override takes precedence, otherwise automatically follow system OS
  const isDark = manualTheme !== null ? manualTheme === "dark" : systemColorScheme === "dark";

  useEffect(() => {
    setAppTheme(isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const nextTheme: "light" | "dark" = isDark ? "light" : "dark";
    setManualTheme(nextTheme);
    setAppTheme(nextTheme === "dark");
    AsyncStorage.setItem(STORAGE_THEME_KEY, nextTheme).catch(() => {});
  };

  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    ClientAuthManager.getCurrentSession()
  );




  const headerAccount = (authSession?.user && !authSession.user.isGuest)
    ? {
        name: authSession.user.fullName,
        email: authSession.user.email,
        avatarInitials: authSession.user.fullName
          ? authSession.user.fullName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : "ПУ",
      }
    : undefined;

  const handleOpenProfileOrAuth = () => {
    if (authSession?.user && !authSession.user.isGuest) {
      setProfileVisible(true);
    } else {
      setAuthModalVisible(true);
    }
  };

  const scrollViewRef = useRef<any>(null);

  const {
    messages,
    tripOptions,
    selectedOption,
    isThinking,
    thinkingText,
    isStreaming,
    checkoutVisible,
    checkoutOption,
    backendUrl,
    setBackendUrl,
    sendMessage,
    selectOption,
    selectSession,
    deleteSession,
    savedSessions,
    activeSessionId,
    openCheckout,
    closeCheckout,
    handleBookingConfirmed,
    resetChat,
  } = useMobileAgent();

  // Synchronize mobile storage cache & ensure guest session
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [tok, uRaw, lRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_AUTH_TOKEN_KEY),
          AsyncStorage.getItem(STORAGE_USER_KEY),
          AsyncStorage.getItem(LEGACY_STORAGE_CURRENT_SESSION_KEY),
        ]);
        if (tok) mobileMemoryCache.set(STORAGE_AUTH_TOKEN_KEY, tok);
        if (uRaw) mobileMemoryCache.set(STORAGE_USER_KEY, uRaw);
        if (lRaw) mobileMemoryCache.set(LEGACY_STORAGE_CURRENT_SESSION_KEY, lRaw);

        await ClientAuthManager.ensureAuthToken(backendUrl);
        if (isMounted) {
          setAuthSession(ClientAuthManager.getCurrentSession());
        }
      } catch {
        // fallback
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [backendUrl]);

  const handleSendActiveChat = () => {
    if (!inputText.trim() || isThinking || isStreaming) return;
    const text = inputText;
    setInputText("");
    sendMessage(text);
  };

  const handleSelectChip = (chipText: string) => {
    if (isThinking || isStreaming) return;
    sendMessage(chipText);
  };

  const handleSelectOption = (opt: TripOption | null) => {
    selectOption(opt);
  };

  const handleApplyFilters = (filterPrompt: string) => {
    if (messages.length === 0) {
      setInputText((prev) =>
        prev.trim() ? `${prev.trim()} (${filterPrompt})` : filterPrompt
      );
    } else {
      sendMessage(filterPrompt);
    }
  };

  // Scroll to bottom when new messages arrive, thinking toggles, or options update (when in chat feed mode)
  useEffect(() => {
    if (selectedOption) return;
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [messages, isThinking, tripOptions, selectedOption]);

  const isInitialState = messages.length === 0;

  return (
    <View style={[styles.rootContainer, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      {/* Top Header matching Web Stitch Purple #581C87 */}
      <Header
        title="О!дин запрос"
        subtitle="Ассистент путешествий"
        onMenuPress={() => setHistoryVisible(true)}
        onNewChatPress={resetChat}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onProfilePress={() => setProfileVisible(true)}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Messages and Content Feed */}
        <ScrollView
          ref={scrollViewRef}
          style={[styles.feed, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            styles.feedContent,
            isInitialState ? styles.feedContentInitial : { paddingBottom: 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (!isInitialState) {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }
          }}
        >
          {/* Screen 1: Welcome matching Web ChatView Hero with raised cards */}
          {isInitialState ? (
            <View style={styles.welcomeHero}>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Куда хотите поехать?
              </Text>
              <Text style={[styles.heroDescription, { color: colors.textSecondary }]}>
                Опишите поездку своими словами: даты, бюджет, пожелания к пляжу
                или компании. ИИ подберёт честные варианты и соберёт готовый маршрут.
              </Text>

              {/* Starter Scenarios Cards raised up, filling screen space beautifully */}
              <View style={styles.starterCardsContainer}>
                {SHARED_SUGGESTIONS.slice(0, 4).map((suggestionText) => {
                  const iconName = getSuggestionIcon(suggestionText);
                  return (
                    <TouchableOpacity
                      key={suggestionText}
                      style={[
                        styles.starterCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => handleSelectChip(suggestionText)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.starterCardIconBox,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceContainer
                              : colors.canvasMuted,
                          },
                        ]}
                      >
                        <Icon name={iconName} size={16} color={colors.primary} />
                      </View>
                      <Text
                        style={[
                          styles.starterCardText,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={2}
                      >
                        {suggestionText}
                      </Text>
                      <Icon
                        name="arrow-up-right"
                        size={15}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            /* Screen 2, 3, 4: Active Chat & Recommendations Flow */
            <View style={styles.activeChatWrapper}>
              {/* Message Turns */}
              <View style={styles.messagesList}>
                {messages.map((m) => (
                  <ChatMessageItem
                    key={m.id}
                    message={m}
                    selectedOption={selectedOption}
                    selectedOptionId={selectedOption?.id}
                    onSelectOption={handleSelectOption}
                    onBookDemo={openCheckout}
                    onSelectChip={handleSelectChip}
                    isDark={isDark}
                  />
                ))}

                {isThinking && (
                  <ThinkingBubble
                    isThinking={true}
                    statusText={thinkingText}
                    isDark={isDark}
                  />
                )}
              </View>

              {/* Fallback Trip Dossier View if an option was loaded but not tied to a specific turn */}
              {selectedOption &&
                !messages.some((m) =>
                  (m.trip_options || m.tripOptions)?.some(
                    (o) =>
                      o.id === selectedOption.id ||
                      o.title === selectedOption.title
                  )
                ) && (
                  <TripDossierView
                    option={selectedOption}
                    onBackToList={() => handleSelectOption(null)}
                    onBookTour={openCheckout}
                    isDark={isDark}
                  />
                )}
            </View>
          )}
        </ScrollView>

        {/* Docked Bottom Chat Bar */}
        <View
          style={[
            styles.dockedBottomContainer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.borderSubtle,
            },
          ]}
        >
          <ChatInputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSendActiveChat}
            disabled={isThinking || isStreaming}
            onFilterPress={() => setFiltersVisible(true)}
            isDark={isDark}
          />
        </View>

        {/* Real Production-grade Booking Checkout Modal */}
        <BookingCheckoutModal
          visible={checkoutVisible}
          option={checkoutOption}
          onClose={closeCheckout}
          onConfirmSuccess={handleBookingConfirmed}
          initialTraveler={{
            name: authSession?.user?.fullName || "",
            phone: authSession?.user?.phone || "",
            email: authSession?.user?.email || "",
          }}
        />

        {/* Traveler Profile & Settings Modal */}
        <ProfileModal
          visible={profileVisible}
          onClose={() => setProfileVisible(false)}
          currentUser={authSession?.user || null}
          onOpenAuth={() => setAuthModalVisible(true)}
          onLogout={() => {
            ClientAuthManager.logout(backendUrl);
            setAuthSession(ClientAuthManager.getCurrentSession());
          }}
          backendUrl={backendUrl}
          onUpdateBackendUrl={setBackendUrl}
          isDark={isDark}
        />

        {/* Real Authentication Modal (Login & Registration) */}
        <AuthModal
          visible={authModalVisible}
          onClose={() => setAuthModalVisible(false)}
          onAuthSuccess={(session) => {
            setAuthSession(session);
          }}
          isDark={isDark}
          baseUrl={backendUrl}
        />
      </KeyboardAvoidingView>

      {/* Animated Slide-out Sidebar Drawer (in-tree root overlay, 0ms status bar flicker) */}
      <SidebarDrawer
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        savedSessions={savedSessions}
        activeSessionId={activeSessionId}
        onSelectSession={(session) => selectSession(session)}
        onDeleteSession={(id) => deleteSession(id)}
        onNewChat={resetChat}
        activeAccount={headerAccount}
        onOpenProfile={() => setProfileVisible(true)}
        onOpenAuth={() => setAuthModalVisible(true)}
        onOpenProfileOrAuth={handleOpenProfileOrAuth}
        isDark={isDark}
      />

      {/* Travel Search Filters Overlay (1:1 Web Parity, 0ms opening lag) */}
      <TravelFiltersModal
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        onApplyFilters={handleApplyFilters}
        isDark={isDark}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  feedContentInitial: {
    paddingBottom: 40,
  },
  welcomeHero: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  heroDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 320,
  },
  starterCardsContainer: {
    width: "100%",
    marginTop: 22,
    gap: 10,
  },
  starterCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 13,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadows.sm,
  },
  starterCardDark: {
    backgroundColor: darkColors.surface,
    borderColor: darkColors.border,
  },
  starterCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  starterCardIconBoxDark: {
    backgroundColor: darkColors.surfaceContainer,
  },
  starterCardText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  textPrimaryDark: {
    color: darkColors.textPrimary,
  },
  textSecondaryDark: {
    color: darkColors.textSecondary,
  },
  rootContainerDark: {
    backgroundColor: darkColors.background,
  },
  feedDark: {
    backgroundColor: darkColors.background,
  },
  activeChatWrapper: {
    width: "100%",
    gap: 12,
  },
  messagesList: {
    gap: 12,
  },
  dockedBottomContainer: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  dockedBottomContainerDark: {
    backgroundColor: darkColors.background,
    borderTopColor: darkColors.borderSubtle,
  },
});

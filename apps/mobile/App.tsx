import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  SHARED_SUGGESTIONS,
  TripOption,
  ClientAuthManager,
  AuthSession,
} from "@corvax/shared";
import { theme } from "./src/theme";
import { Icon, IconName } from "./src/components/common/Icon";
import { Header } from "./src/components/common/Header";
import { ChatMessageItem } from "./src/components/chat/ChatMessageItem";
import { ChatInputBar } from "./src/components/chat/ChatInputBar";
import { ThinkingBubble } from "./src/components/chat/ThinkingBubble";
import { TripCardMobile } from "./src/components/cards/TripCardMobile";
import { TripDossierView } from "./src/components/cards/TripDossierView";
import { BookingCheckoutModal } from "./src/components/modals/DemoCheckoutModal";
import { HistoryModal } from "./src/components/modals/HistoryModal";
import { ProfileModal } from "./src/components/modals/ProfileModal";
import { AuthModal } from "./src/components/modals/AuthModal";
import { TravelFiltersModal } from "./src/components/modals/TravelFiltersModal";
import { useMobileAgent } from "./src/hooks/useMobileAgent";

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

  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    ClientAuthManager.getCurrentSession()
  );

  const headerAccount = authSession?.user
    ? {
        name: authSession.user.fullName,
        avatarInitials: authSession.user.fullName
          ? authSession.user.fullName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : "ПУ",
        tier: authSession.user.tier,
      }
    : undefined;

  const handleOpenProfileOrAuth = () => {
    if (authSession?.user) {
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
    if (opt) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 60);
    }
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
    <View style={styles.rootContainer}>
      <StatusBar style="light" />

      {/* Top Header matching Web Stitch Purple #581C87 */}
      <Header
        title="О!дин запрос"
        subtitle="Ассистент путешествий"
        activeAccount={headerAccount}
        onMenuPress={() => setHistoryVisible(true)}
        onNewChatPress={resetChat}
        onSettingsPress={handleOpenProfileOrAuth}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Messages and Content Feed */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.feed}
          contentContainerStyle={[
            styles.feedContent,
            isInitialState && styles.feedContentInitial,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Screen 1: Welcome matching Web ChatView Hero without compass icon */}
          {isInitialState ? (
            <View style={styles.welcomeHero}>
              <Text style={styles.heroTitle}>Куда хотите поехать?</Text>
              <Text style={styles.heroDescription}>
                Опишите поездку своими словами: даты, бюджет, пожелания к пляжу
                или компании. ИИ подберёт честные варианты и соберёт готовый маршрут.
              </Text>

              {/* History Dialogs Action Link */}
              <TouchableOpacity
                style={styles.historyLink}
                onPress={() => setHistoryVisible(true)}
                activeOpacity={0.7}
              >
                <Icon name="clock" size={14} color={theme.colors.primary} />
                <Text style={styles.historyLinkText}>История диалогов</Text>
              </TouchableOpacity>
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
                    selectedOptionId={selectedOption?.id}
                    onSelectOption={(opt) => handleSelectOption(opt)}
                    onBookDemo={openCheckout}
                    onSelectChip={handleSelectChip}
                  />
                ))}

                {isThinking && (
                  <ThinkingBubble
                    isThinking={true}
                    statusText={thinkingText}
                  />
                )}
              </View>

              {/* Screen 3 & 4: Detailed Tour Dossier when an option is selected */}
              {selectedOption && (
                <TripDossierView
                  option={selectedOption}
                  onBackToList={() => handleSelectOption(null)}
                  onBookTour={openCheckout}
                />
              )}
            </View>
          )}
        </ScrollView>

        {/* Docked Bottom Chat Bar with Prompt Suggestions directly above it */}
        <View style={styles.dockedBottomContainer}>
          {isInitialState && (
            <View style={styles.dockedSuggestionsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dockedSuggestionsScroll}
                keyboardShouldPersistTaps="handled"
              >
                {SHARED_SUGGESTIONS.map((suggestionText) => {
                  const iconName = getSuggestionIcon(suggestionText);
                  return (
                    <TouchableOpacity
                      key={suggestionText}
                      style={styles.suggestionPill}
                      onPress={() => handleSelectChip(suggestionText)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.suggestionPillIconBox}>
                        <Icon name={iconName} size={13} color={theme.colors.primary} />
                      </View>
                      <Text style={styles.suggestionPillText} numberOfLines={1}>
                        {suggestionText}
                      </Text>
                      <Icon
                        name="arrow-up-right"
                        size={12}
                        color={theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <ChatInputBar
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSendActiveChat}
            disabled={isThinking || isStreaming}
            onFilterPress={() => setFiltersVisible(true)}
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

        {/* History Sessions Modal with real saved chats */}
        <HistoryModal
          visible={historyVisible}
          onClose={() => setHistoryVisible(false)}
          savedSessions={savedSessions}
          activeSessionId={activeSessionId}
          onSelectSavedSession={(session) => selectSession(session)}
          onDeleteSession={(id) => deleteSession(id)}
          onStartNewChat={resetChat}
        />

        {/* Traveler Profile & Settings Modal */}
        <ProfileModal
          visible={profileVisible}
          onClose={() => setProfileVisible(false)}
          currentUser={authSession?.user || null}
          onOpenAuth={() => setAuthModalVisible(true)}
          onLogout={() => {
            ClientAuthManager.logout();
            setAuthSession(null);
          }}
          backendUrl={backendUrl}
          onUpdateBackendUrl={setBackendUrl}
        />

        {/* Real Authentication Modal (Login & Registration) */}
        <AuthModal
          visible={authModalVisible}
          onClose={() => setAuthModalVisible(false)}
          onAuthSuccess={(session) => {
            setAuthSession(session);
          }}
        />

        {/* Travel Search Filters Modal */}
        <TravelFiltersModal
          visible={filtersVisible}
          onClose={() => setFiltersVisible(false)}
          onApplyFilters={handleApplyFilters}
        />
      </KeyboardAvoidingView>
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
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
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 320,
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  historyLinkText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  activeChatWrapper: {
    width: "100%",
    gap: 12,
  },
  sessionPillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 4,
  },
  sessionStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sessionDotPulse: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.primary,
  },
  sessionPillText: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  sessionFilterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#059669",
  },
  sessionFilterBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
  },
  messagesList: {
    gap: 12,
  },
  tripCardsContainer: {
    marginTop: 8,
    gap: 14,
  },
  tripSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  tripSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  tripSectionCount: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  dockedBottomContainer: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  dockedSuggestionsWrapper: {
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
  },
  dockedSuggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  suggestionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 7,
    ...theme.shadows.sm,
  },
  suggestionPillIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    maxWidth: 220,
  },
});

import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  SHARED_SUGGESTIONS,
  SHARED_QUICK_CHIPS,
  TripOption,
} from "@corvax/shared";
import { theme } from "./src/theme";
import { Icon, IconName } from "./src/components/common/Icon";
import { Header } from "./src/components/common/Header";
import { ChatMessageItem } from "./src/components/chat/ChatMessageItem";
import { ChatInputBar } from "./src/components/chat/ChatInputBar";
import { QuickReplyChips } from "./src/components/chat/QuickReplyChips";
import { ThinkingBubble } from "./src/components/chat/ThinkingBubble";
import { TripCardMobile } from "./src/components/cards/TripCardMobile";
import { TripDossierView } from "./src/components/cards/TripDossierView";
import { BookingCheckoutModal } from "./src/components/modals/DemoCheckoutModal";
import { HistoryModal, HistoryTripItem } from "./src/components/modals/HistoryModal";
import { ProfileModal } from "./src/components/modals/ProfileModal";
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
  const [heroInputText, setHeroInputText] = useState("");
  const [historyVisible, setHistoryVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
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
    sendMessage,
    selectOption,
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

  const handleSendHero = () => {
    if (!heroInputText.trim() || isThinking || isStreaming) return;
    const text = heroInputText;
    setHeroInputText("");
    sendMessage(text);
  };

  const handleSelectChip = (chipText: string) => {
    if (isThinking || isStreaming) return;
    sendMessage(chipText);
  };

  const handleSelectHistorySession = (session: HistoryTripItem) => {
    sendMessage(session.previewPrompt);
  };

  const handleApplyFilters = (filterPrompt: string) => {
    if (messages.length === 0) {
      setHeroInputText((prev) =>
        prev.trim() ? `${prev.trim()} (${filterPrompt})` : filterPrompt
      );
    } else {
      sendMessage(filterPrompt);
    }
  };

  // Scroll to bottom when new messages arrive, thinking toggles, or options update
  useEffect(() => {
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
        onMenuPress={() => setHistoryVisible(true)}
        onNewChatPress={resetChat}
        onSettingsPress={() => setProfileVisible(true)}
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
          {/* Screen 1: Welcome & Prompt Card matching Web ChatView Hero */}
          {isInitialState ? (
            <View style={styles.welcomeHero}>
              <View style={styles.heroIconBadge}>
                <Icon name="compass" size={26} color={theme.colors.primary} />
              </View>

              <Text style={styles.heroTitle}>Куда хотите поехать?</Text>
              <Text style={styles.heroDescription}>
                Опишите поездку своими словами: даты, бюджет, пожелания к пляжу
                или компании. ИИ подберёт честные варианты и соберёт готовый маршрут.
              </Text>

              {/* Central Interactive Prompt Card */}
              <View style={styles.heroPromptCard}>
                <TextInput
                  style={styles.heroTextInput}
                  value={heroInputText}
                  onChangeText={setHeroInputText}
                  placeholder="Например: Хочу куда-нибудь к тёплому морю в ноябре, недорого, с ребёнком, без долгих перелётов..."
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  numberOfLines={3}
                  editable={!isThinking && !isStreaming}
                />

                <View style={styles.heroCardFooter}>
                  <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setFiltersVisible(true)}
                    activeOpacity={0.7}
                    accessibilityLabel="Параметры поиска"
                  >
                    <Icon name="sliders" size={17} color={theme.colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.heroSendButton,
                      heroInputText.trim() && !isThinking
                        ? styles.heroSendButtonActive
                        : styles.heroSendButtonDisabled,
                    ]}
                    onPress={handleSendHero}
                    disabled={!heroInputText.trim() || isThinking || isStreaming}
                    activeOpacity={0.8}
                    accessibilityLabel="Отправить запрос"
                  >
                    <Icon
                      name="send"
                      size={15}
                      color={heroInputText.trim() && !isThinking ? "#FFFFFF" : theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Starter Scenarios Chips from SHARED_SUGGESTIONS */}
              <View style={styles.starterChipsContainer}>
                {SHARED_SUGGESTIONS.slice(0, 4).map((suggestionText) => {
                  const iconName = getSuggestionIcon(suggestionText);
                  return (
                    <TouchableOpacity
                      key={suggestionText}
                      style={styles.starterChip}
                      onPress={() => handleSelectChip(suggestionText)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.starterChipIconBox}>
                        <Icon name={iconName} size={16} color={theme.colors.primary} />
                      </View>
                      <Text style={styles.starterChipText} numberOfLines={2}>
                        {suggestionText}
                      </Text>
                      <Icon
                        name="arrow-up-right"
                        size={15}
                        color={theme.colors.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* History Dialogs Action Link */}
              <TouchableOpacity
                style={styles.historyLink}
                onPress={() => setHistoryVisible(true)}
                activeOpacity={0.7}
              >
                <Icon name="clock" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.historyLinkText}>История диалогов</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Screen 2, 3, 4: Active Chat & Recommendations Flow */
            <View style={styles.activeChatWrapper}>
              {/* Context Session Pill */}
              <View style={styles.sessionPillRow}>
                <View style={styles.sessionStatusBadge}>
                  <View style={styles.sessionDotPulse} />
                  <Text style={styles.sessionPillText}>Сессия #RU-8821</Text>
                </View>
                <View style={styles.sessionFilterBadge}>
                  <Icon name="shield" size={12} color="#059669" />
                  <Text style={styles.sessionFilterBadgeText}>Гарантия честных цен</Text>
                </View>
              </View>

              {/* Message Turns */}
              <View style={styles.messagesList}>
                {messages.map((m) => (
                  <ChatMessageItem
                    key={m.id}
                    message={m}
                    selectedOptionId={selectedOption?.id}
                    onSelectOption={(opt) => selectOption(opt)}
                    onBookDemo={openCheckout}
                  />
                ))}
              </View>

              {/* Thinking Bubble */}
              {isThinking && (
                <ThinkingBubble
                  isThinking={isThinking}
                  statusText={thinkingText}
                />
              )}

              {/* Screen 3 & 4: Detailed Tour Dossier when an option is selected */}
              {selectedOption ? (
                <TripDossierView
                  option={selectedOption}
                  onBackToList={() => selectOption(null)}
                  onBookTour={openCheckout}
                />
              ) : (
                /* Screen 2: Trip Options Comparison Cards List */
                tripOptions.length > 0 && (
                  <View style={styles.tripCardsContainer}>
                    <View style={styles.tripSectionHeader}>
                      <Text style={styles.tripSectionTitle}>
                        Рекомендованные направления
                      </Text>
                      <Text style={styles.tripSectionCount}>
                        {tripOptions.length} варианта
                      </Text>
                    </View>

                    {tripOptions.map((opt) => (
                      <TripCardMobile
                        key={opt.id || opt.title}
                        option={opt}
                        isSelected={false}
                        onSelect={(chosen) => selectOption(chosen)}
                        onBookDemo={openCheckout}
                      />
                    ))}
                  </View>
                )
              )}
            </View>
          )}
        </ScrollView>

        {/* Floating Quick Chips & Bottom Chat Bar only in Active Chat */}
        {!isInitialState && (
          <View style={styles.dockedBottomContainer}>
            <QuickReplyChips
              chips={SHARED_QUICK_CHIPS as unknown as string[]}
              onSelectChip={handleSelectChip}
            />

            <ChatInputBar
              value={inputText}
              onChangeText={setInputText}
              onSend={handleSendActiveChat}
              disabled={isThinking || isStreaming}
              onFilterPress={() => setFiltersVisible(true)}
            />
          </View>
        )}

        {/* Real Production-grade Booking Checkout Modal */}
        <BookingCheckoutModal
          visible={checkoutVisible}
          option={checkoutOption}
          onClose={closeCheckout}
          onConfirmSuccess={handleBookingConfirmed}
        />

        {/* History Sessions Modal */}
        <HistoryModal
          visible={historyVisible}
          onClose={() => setHistoryVisible(false)}
          onSelectSession={handleSelectHistorySession}
          onStartNewChat={resetChat}
        />

        {/* Traveler Profile & Settings Modal */}
        <ProfileModal
          visible={profileVisible}
          onClose={() => setProfileVisible(false)}
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
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: 4,
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primaryLight, // #FAF5FF
    borderWidth: 1,
    borderColor: "rgba(88, 28, 135, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...theme.shadows.sm,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  heroDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 340,
  },
  heroPromptCard: {
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 22,
    ...theme.shadows.md,
  },
  heroTextInput: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    minHeight: 64,
    textAlignVertical: "top",
    lineHeight: 22,
    padding: 0,
  },
  heroCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: 10,
    marginTop: 8,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.canvasMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  heroSendButtonActive: {
    backgroundColor: theme.colors.primary, // #581C87
    ...theme.shadows.sm,
  },
  starterChipsContainer: {
    width: "100%",
    marginTop: 22,
    gap: 10,
  },
  starterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
    ...theme.shadows.sm,
  },
  starterChipIconBox: {
    width: 34,
    height: 34,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  starterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceContainer,
  },
  historyLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
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
    gap: 4,
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
  },
});

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
import { theme } from "./src/theme";
import { Header } from "./src/components/common/Header";
import { ChatMessageItem } from "./src/components/chat/ChatMessageItem";
import { ChatInputBar } from "./src/components/chat/ChatInputBar";
import { QuickReplyChips } from "./src/components/chat/QuickReplyChips";
import { ThinkingBubble } from "./src/components/chat/ThinkingBubble";
import { TripCardMobile } from "./src/components/cards/TripCardMobile";
import { BookingCheckoutModal } from "./src/components/modals/DemoCheckoutModal";
import { HistoryModal, HistoryTripItem } from "./src/components/modals/HistoryModal";
import { ProfileModal } from "./src/components/modals/ProfileModal";
import { TravelFiltersModal } from "./src/components/modals/TravelFiltersModal";
import { useMobileAgent } from "./src/hooks/useMobileAgent";

function MainApp() {
  const [inputText, setInputText] = useState("");
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
    isListening,
    checkoutVisible,
    checkoutOption,
    sendMessage,
    selectOption,
    openCheckout,
    closeCheckout,
    handleBookingConfirmed,
    resetChat,
    toggleListening,
  } = useMobileAgent();

  const handleSend = () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText("");
    sendMessage(text);
  };

  const handleSelectChip = (chipText: string) => {
    sendMessage(chipText);
  };

  const handleToggleVoiceInput = () => {
    if (!isListening) {
      toggleListening();
      // Simulate real-time speech-to-text recognition
      setTimeout(() => {
        setInputText("Хочу к тёплому морю в ноябре с ребёнком 5 лет, бюджет до 200 000 рублей");
        toggleListening();
      }, 1800);
    } else {
      toggleListening();
    }
  };

  const handleSelectHistorySession = (session: HistoryTripItem) => {
    sendMessage(session.previewPrompt);
  };

  const handleApplyFilters = (filterPrompt: string) => {
    sendMessage(filterPrompt);
  };

  // Scroll to bottom when new messages arrive or options appear
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isThinking, tripOptions]);

  const isInitialState = messages.length <= 1;

  return (
    <View style={styles.rootContainer}>
      <StatusBar style="light" />

      {/* Top Header with Edge-to-Edge Safe Inset Handling */}
      <Header
        title="О!дин запрос"
        subtitle="ИИ-помощник в путешествиях"
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
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome Screen Cards if start of conversation (Stitch Screen 1) */}
          {isInitialState && (
            <View style={styles.welcomeHero}>
              <View style={styles.heroIconBadge}>
                <Text style={styles.heroIcon}>🌍</Text>
              </View>
              <Text style={styles.heroTitle}>Куда хотите поехать?</Text>
              <Text style={styles.heroDescription}>
                Напишите своими словами: даты, бюджет, пожелания — ассистент подберёт
                направления, отели и маршрут за один шаг.
              </Text>

              {/* Starter Scenarios Chips from Stitch Screen 1 */}
              <View style={styles.starterChipsContainer}>
                <TouchableOpacity
                  style={styles.starterChip}
                  onPress={() =>
                    handleSelectChip("Тёплое море в ноябре с ребёнком до 200 000 ₽")
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.starterChipIconBox}>
                    <Text style={styles.starterIcon}>🏖️</Text>
                  </View>
                  <Text style={styles.starterChipText} numberOfLines={1}>
                    Тёплое море в ноябре с ребёнком до 200 000 ₽
                  </Text>
                  <Text style={styles.starterArrow}>↗</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.starterChip}
                  onPress={() =>
                    handleSelectChip("Горные лыжи в Сочи на двоих в январе")
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.starterChipIconBox}>
                    <Text style={styles.starterIcon}>⛷️</Text>
                  </View>
                  <Text style={styles.starterChipText} numberOfLines={1}>
                    Горные лыжи в Сочи на двоих в январе
                  </Text>
                  <Text style={styles.starterArrow}>↗</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.starterChip}
                  onPress={() =>
                    handleSelectChip("Выходные в Стамбуле: уютный бутик-отель")
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.starterChipIconBox}>
                    <Text style={styles.starterIcon}>🏛️</Text>
                  </View>
                  <Text style={styles.starterChipText} numberOfLines={1}>
                    Выходные в Стамбуле: уютный бутик-отель
                  </Text>
                  <Text style={styles.starterArrow}>↗</Text>
                </TouchableOpacity>
              </View>

              {/* History Dialogs Action */}
              <TouchableOpacity
                style={styles.historyLink}
                onPress={() => setHistoryVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.historyLinkIcon}>🕒</Text>
                <Text style={styles.historyLinkText}>История диалогов</Text>
              </TouchableOpacity>

              {/* Step Synthesis Feature Badge */}
              <View style={styles.heroFeatureBadge}>
                <Text style={styles.heroFeatureIcon}>⚡</Text>
                <Text style={styles.heroFeatureText}>
                  Синтез билетов, жилья и трансферов за один шаг
                </Text>
              </View>
            </View>
          )}

          {/* Chat Messages Turn List (Stitch Screen 2) */}
          {!isInitialState && (
            <View style={styles.messagesList}>
              {messages.map((m) => (
                <ChatMessageItem
                  key={m.id}
                  message={m}
                  selectedOptionId={selectedOption?.id}
                  onSelectOption={selectOption}
                  onBookDemo={openCheckout}
                />
              ))}
            </View>
          )}

          {/* Thinking Capsule / Indicator */}
          {isThinking && (
            <ThinkingBubble
              isThinking={isThinking}
              statusText={thinkingText}
            />
          )}

          {/* Standalone Trip Options Cards (Stitch Screen 3 & 4) */}
          {tripOptions.length > 0 && (
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
                  isSelected={selectedOption?.id === opt.id}
                  onSelect={selectOption}
                  onBookDemo={openCheckout}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips (Stitch Screen 2) above input */}
        <QuickReplyChips
          chips={
            tripOptions.length > 0
              ? [
                  "🏨 Показать отели в ОАЭ",
                  "⚖️ Сравнить отели",
                  "📅 А если на 2 дня позже?",
                  "✈️ Только прямые рейсы",
                ]
              : undefined
          }
          onSelectChip={handleSelectChip}
        />

        {/* Mobile Input Bar with Safe Area Bottom Padding */}
        <ChatInputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          disabled={isThinking || isStreaming}
          isListening={isListening}
          onToggleMic={handleToggleVoiceInput}
          onFilterPress={() => setFiltersVisible(true)}
          placeholder="Например: Хочу к теплому морю в ноябре..."
        />

        {/* Booking & Checkout Modal (Stitch Screen 5) */}
        <BookingCheckoutModal
          visible={checkoutVisible}
          option={checkoutOption}
          onClose={closeCheckout}
          onConfirmSuccess={handleBookingConfirmed}
        />

        {/* History Dialogs Modal */}
        <HistoryModal
          visible={historyVisible}
          onClose={() => setHistoryVisible(false)}
          onSelectSession={handleSelectHistorySession}
          onStartNewChat={resetChat}
        />

        {/* Profile & Settings Modal */}
        <ProfileModal
          visible={profileVisible}
          onClose={() => setProfileVisible(false)}
        />

        {/* Travel Filters Modal */}
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
  welcomeHero: {
    alignItems: "center",
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: 8,
  },
  heroIconBadge: {
    width: 52,
    height: 52,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...theme.shadows.sm,
  },
  heroIcon: {
    fontSize: 26,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  heroDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 320,
  },
  starterChipsContainer: {
    width: "100%",
    marginTop: 24,
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
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  starterIcon: {
    fontSize: 18,
  },
  starterChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.textPrimary,
    flex: 1,
  },
  starterArrow: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    fontWeight: "600",
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.canvasMuted,
  },
  historyLinkIcon: {
    fontSize: 13,
  },
  historyLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  heroFeatureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroFeatureIcon: {
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  heroFeatureText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: "500",
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
    color: theme.colors.textTertiary,
    fontWeight: "500",
  },
});

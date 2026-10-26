import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { theme } from "./src/theme";
import { Header } from "./src/components/common/Header";
import { ChatMessageItem } from "./src/components/chat/ChatMessageItem";
import { ChatInputBar } from "./src/components/chat/ChatInputBar";
import { QuickReplyChips } from "./src/components/chat/QuickReplyChips";
import { ThinkingBubble } from "./src/components/chat/ThinkingBubble";
import { TripCardMobile } from "./src/components/cards/TripCardMobile";
import { DemoCheckoutModal } from "./src/components/modals/DemoCheckoutModal";
import { useMobileAgent } from "./src/hooks/useMobileAgent";

export default function App() {
  const [inputText, setInputText] = useState("");
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
    // Strip leading emoji if desired or send directly
    sendMessage(chipText);
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
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Top Header */}
        <Header
          title="О!дин запрос"
          subtitle="ИИ-помощник в путешествиях"
          onNewChatPress={resetChat}
        />

        {/* Messages and Content Feed */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Screen Cards if start of conversation (Screen 1) */}
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
            </View>
          )}

          {/* Chat Messages Turn List (Screen 2) */}
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

          {/* Standalone Trip Options Cards (Screen 3 & 4) */}
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

        {/* Quick Suggestion Chips (Screen 2) above input */}
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

        {/* Mobile Input Bar */}
        <ChatInputBar
          value={inputText}
          onChangeText={setInputText}
          onSend={handleSend}
          disabled={isThinking || isStreaming}
          isListening={isListening}
          onToggleMic={toggleListening}
          placeholder="Например: Хочу к теплому морю в ноябре..."
        />

        {/* Demo Booking & Checkout Modal (Screen 5) */}
        <DemoCheckoutModal
          visible={checkoutVisible}
          option={checkoutOption}
          onClose={closeCheckout}
          onConfirmSuccess={handleBookingConfirmed}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroIcon: {
    fontSize: 24,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  heroDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 320,
  },
  starterChipsContainer: {
    width: "100%",
    marginTop: 20,
    gap: 8,
  },
  starterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.sm,
  },
  starterChipIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  starterIcon: {
    fontSize: 16,
  },
  starterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textPrimary,
    flex: 1,
  },
  starterArrow: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontWeight: "600",
  },
  messagesList: {
    gap: 10,
  },
  tripCardsContainer: {
    marginTop: 8,
    gap: 12,
  },
  tripSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  tripSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  tripSectionCount: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontWeight: "500",
  },
});

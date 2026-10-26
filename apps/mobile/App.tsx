import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  formatPrice,
  formatDateRange,
  MOCK_TRIP_OPTIONS,
  TripOption,
} from "@corvax/shared";
import { theme } from "./src/theme";

export default function App() {
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; text: string }>>([
    {
      id: "1",
      role: "assistant",
      text: "Привет! Я AI-ассистент «О!дин запрос». Расскажите, куда и как вы хотите поехать — я подберу готовый маршрут с отелями и билетами.",
    },
  ]);
  const [input, setInput] = useState("");
  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", text: userText },
      {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "По вашему запросу я подобрал отличные варианты. Обратите внимание: цены и доступность являются демонстрационными.",
      },
    ]);

    setTripOptions(MOCK_TRIP_OPTIONS);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>О!</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>О!дин запрос</Text>
              <Text style={styles.headerSubtitle}>AI Travel Planner • Mobile</Text>
            </View>
          </View>
          <View style={styles.demoPill}>
            <Text style={styles.demoPillText}>Демо-режим</Text>
          </View>
        </View>

        {/* Messages Feed */}
        <ScrollView style={styles.feed} contentContainerStyle={styles.feedContent}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.messageBubble,
                m.role === "user" ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  m.role === "user" ? styles.userText : styles.assistantText,
                ]}
              >
                {m.text}
              </Text>
            </View>
          ))}

          {/* Render Trip Options if available */}
          {tripOptions.length > 0 && (
            <View style={styles.cardsSection}>
              <Text style={styles.cardsTitle}>Рекомендованные варианты поездки</Text>
              {tripOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.card,
                    selectedOption?.id === opt.id && styles.selectedCard,
                  ]}
                  onPress={() => setSelectedOption(opt)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardDestination}>{opt.destination}</Text>
                    <Text style={styles.cardPrice}>
                      {formatPrice(opt.total_price, opt.currency)}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{opt.title}</Text>
                  {opt.hotels?.[0] && (
                    <Text style={styles.cardHotel}>
                      🏨 {opt.hotels[0].hotel} ({formatDateRange(opt.hotels[0].check_in, opt.hotels[0].check_out)})
                    </Text>
                  )}
                  {opt.flights?.[0] && (
                    <Text style={styles.cardFlight}>
                      ✈️ {opt.flights[0].origin} → {opt.flights[0].destination}
                    </Text>
                  )}
                  <View style={styles.cardFooter}>
                    <Text style={styles.demoWarning}>[Демонстрационные данные]</Text>
                    <Text style={styles.selectAction}>
                      {selectedOption?.id === opt.id ? "✓ Выбрано" : "Выбрать →"}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Куда и когда вы хотите поехать?..."
            placeholderTextColor={theme.colors.textMuted}
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  demoPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  demoPillText: {
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  messageBubble: {
    maxWidth: "85%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: theme.colors.textPrimary,
  },
  cardsSection: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  cardsTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: 6,
  },
  selectedCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDestination: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.colors.primary,
    textTransform: "uppercase",
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.textPrimary,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  cardHotel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cardFlight: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceMuted,
  },
  demoWarning: {
    fontSize: 10,
    color: "#B45309",
    fontWeight: "500",
  },
  selectAction: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
});

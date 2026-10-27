import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";

export interface HistoryTripItem {
  id: string;
  title: string;
  destination: string;
  dates: string;
  price: string;
  previewPrompt: string;
  icon: string;
}

export interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (item: HistoryTripItem) => void;
  onStartNewChat: () => void;
}

export const INITIAL_HISTORY: HistoryTripItem[] = [
  {
    id: "hist-1",
    title: "Radisson Resort Marjan Island 4★",
    destination: "ОАЭ, Рас-эль-Хайма",
    dates: "14–21 ноября (7 ночей)",
    price: "163 900 ₽",
    previewPrompt: "Тёплое море в ноябре с ребёнком до 200 000 ₽",
    icon: "🏖️",
  },
  {
    id: "hist-2",
    title: "Golden Tulip Rosa Khutor 4★",
    destination: "Сочи, Красная Поляна",
    dates: "5–10 января (5 ночей)",
    price: "98 000 ₽",
    previewPrompt: "Горные лыжи в Сочи на двоих в январе",
    icon: "⛷️",
  },
  {
    id: "hist-3",
    title: "The Galata Hotel Istanbul 4★",
    destination: "Турция, Стамбул",
    dates: "12–15 октября (3 ночи)",
    price: "64 000 ₽",
    previewPrompt: "Выходные в Стамбуле: уютный бутик-отель",
    icon: "🏛️",
  },
];

export const HistoryModal: React.FC<HistoryModalProps> = ({
  visible,
  onClose,
  onSelectSession,
  onStartNewChat,
}) => {
  const insets = useSafeAreaInsets();
  const [historyItems, setHistoryItems] = useState<HistoryTripItem[]>(INITIAL_HISTORY);

  const handleDelete = (id: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>История диалогов</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{historyItems.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel="Закрыть"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Top Quick Action */}
          <View style={styles.topActionBar}>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={() => {
                onClose();
                onStartNewChat();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.newChatIcon}>✎</Text>
              <Text style={styles.newChatText}>Начать новый диалог</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {historyItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📂</Text>
                <Text style={styles.emptyTitle}>История пуста</Text>
                <Text style={styles.emptySub}>
                  Задайте вопрос ассистенту, и результаты подбора сохранятся здесь.
                </Text>
              </View>
            ) : (
              historyItems.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <TouchableOpacity
                    style={styles.itemClickableArea}
                    onPress={() => {
                      onSelectSession(item);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemIconBox}>
                      <Text style={styles.itemIcon}>{item.icon}</Text>
                    </View>

                    <View style={styles.itemDetails}>
                      <View style={styles.itemTopRow}>
                        <Text style={styles.itemDestination}>{item.destination}</Text>
                        <Text style={styles.itemPrice}>{item.price}</Text>
                      </View>
                      <Text style={styles.itemHotelTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemDates}>{item.dates}</Text>
                      <View style={styles.promptBubble}>
                        <Text style={styles.promptText} numberOfLines={1}>
                          «{item.previewPrompt}»
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.id)}
                    accessibilityLabel="Удалить из истории"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
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
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: "hidden",
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  countBadge: {
    backgroundColor: theme.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary, // #581C87
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  topActionBar: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary, // #581C87
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 10,
    gap: 8,
    ...theme.shadows.sm,
  },
  newChatIcon: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  newChatText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scroll: {
    maxHeight: "100%",
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.sm,
  },
  itemClickableArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  itemIcon: {
    fontSize: 20,
  },
  itemDetails: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemDestination: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary, // #581C87
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary, // #581C87
  },
  itemHotelTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  itemDates: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  promptBubble: {
    backgroundColor: theme.colors.surfaceContainer,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  promptText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
  deleteButton: {
    padding: 8,
  },
  deleteIcon: {
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: "center",
    maxWidth: 240,
  },
});

import React from "react";
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
import { Icon } from "../common/Icon";
import { HistorySessionRecord } from "../../hooks/useMobileAgent";

export interface HistoryTripItem {
  id: string;
  title: string;
  destination: string;
  dates: string;
  price: string;
  previewPrompt: string;
  iconName?: "sun" | "mountain" | "building";
}

export interface HistoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (item: HistoryTripItem) => void;
  onStartNewChat: () => void;
  recentSessions?: HistorySessionRecord[];
}

export const POPULAR_SCENARIOS: HistoryTripItem[] = [
  {
    id: "pop-1",
    title: "Тёплое море в ноябре",
    destination: "ОАЭ, Рас-эль-Хайма / Дубай",
    dates: "7 ночей",
    price: "от 145 000 ₽",
    previewPrompt: "Хочу к тёплому морю в ноябре с ребёнком, прямой рейс, бюджет до 200 000 ₽",
    iconName: "sun",
  },
  {
    id: "pop-2",
    title: "Горнолыжный отдых",
    destination: "Сочи, Красная Поляна",
    dates: "5 ночей",
    price: "от 89 000 ₽",
    previewPrompt: "Горные лыжи в Сочи на двоих в январе без очередей на подъёмники",
    iconName: "mountain",
  },
  {
    id: "pop-3",
    title: "Уикенд в Стамбуле",
    destination: "Турция, Стамбул (Бейоглу)",
    dates: "3 ночи",
    price: "от 64 000 ₽",
    previewPrompt: "Уикенд в Стамбуле на двоих с уютным отелем возле достопримечательностей",
    iconName: "building",
  },
];

export const HistoryModal: React.FC<HistoryModalProps> = ({
  visible,
  onClose,
  onSelectSession,
  onStartNewChat,
  recentSessions = [],
}) => {
  const insets = useSafeAreaInsets();

  const handleSelectRecent = (session: HistorySessionRecord) => {
    onSelectSession({
      id: session.id,
      title: session.query,
      destination: "Поиск",
      dates: session.timestamp,
      price: "",
      previewPrompt: session.query,
      iconName: "sun",
    });
    onClose();
  };

  const handleSelectPopular = (item: HistoryTripItem) => {
    onSelectSession(item);
    onClose();
  };

  const handleNewChat = () => {
    onStartNewChat();
    onClose();
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
            <View style={styles.headerTitleCol}>
              <Text style={styles.headerTitle}>История диалогов</Text>
              <Text style={styles.headerSub}>Предыдущие поиски и популярные туры</Text>
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
            {/* New Chat Button */}
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={handleNewChat}
              activeOpacity={0.8}
            >
              <Icon name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.newChatButtonText}>Начать новый поиск</Text>
            </TouchableOpacity>

            {/* Recent Sessions in Current App Runtime */}
            {recentSessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionCaption}>Недавние запросы</Text>
                <View style={styles.list}>
                  {recentSessions.map((session) => (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.recentItem}
                      onPress={() => handleSelectRecent(session)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.recentItemIconBox}>
                        <Icon name="sparkles" size={14} color={theme.colors.primary} />
                      </View>
                      <View style={styles.recentItemTextCol}>
                        <Text style={styles.recentItemTitle} numberOfLines={2}>
                          {session.query}
                        </Text>
                        <Text style={styles.recentItemTime}>{session.timestamp}</Text>
                      </View>
                      <Icon name="arrow-up-right" size={14} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Popular Scenarios */}
            <View style={styles.section}>
              <Text style={styles.sectionCaption}>Популярные сценарии</Text>
              <View style={styles.list}>
                {POPULAR_SCENARIOS.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.popularCard}
                    onPress={() => handleSelectPopular(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.popularIconBox}>
                      <Icon
                        name={item.iconName || "sun"}
                        size={18}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.popularContent}>
                      <View style={styles.popularHeaderRow}>
                        <Text style={styles.popularTitle}>{item.title}</Text>
                        <Text style={styles.popularPrice}>{item.price}</Text>
                      </View>
                      <Text style={styles.popularDestination}>{item.destination}</Text>
                      <Text style={styles.popularPrompt} numberOfLines={1}>
                        «{item.previewPrompt}»
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const INITIAL_HISTORY = POPULAR_SCENARIOS;

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
    maxHeight: "88%",
    overflow: "hidden",
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
  headerTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    maxHeight: "100%",
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 16,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.lg,
    gap: 8,
    ...theme.shadows.sm,
  },
  newChatButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  section: {
    gap: 8,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  list: {
    gap: 8,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  recentItemIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  recentItemTextCol: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  recentItemTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  popularCard: {
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
  popularIconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  popularContent: {
    flex: 1,
  },
  popularHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  popularPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  popularDestination: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  popularPrompt: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 3,
    fontStyle: "italic",
  },
});

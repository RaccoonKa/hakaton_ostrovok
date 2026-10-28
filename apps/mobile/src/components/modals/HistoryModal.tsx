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
import { formatDisplayTime } from "@corvax/shared";
import { SavedMobileSession } from "../../hooks/useMobileAgent";

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
  onSelectSession?: (item: HistoryTripItem) => void;
  onStartNewChat: () => void;
  savedSessions?: SavedMobileSession[];
  activeSessionId?: string | null;
  onSelectSavedSession?: (session: SavedMobileSession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  visible,
  onClose,
  onStartNewChat,
  savedSessions = [],
  activeSessionId,
  onSelectSavedSession,
  onDeleteSession,
}) => {
  const insets = useSafeAreaInsets();

  const handleSelect = (session: SavedMobileSession) => {
    if (onSelectSavedSession) {
      onSelectSavedSession(session);
    }
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
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Title Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBox}>
                <Icon name="history" size={16} color={theme.colors.primary} />
              </View>
              <Text style={styles.headerTitle}>История диалогов</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
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
              <Text style={styles.newChatButtonText}>Новый маршрут</Text>
            </TouchableOpacity>

            {/* Saved Chat Sessions */}
            <View style={styles.section}>
              <Text style={styles.sectionCaption}>Сохранённые маршруты</Text>

              {savedSessions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconBox}>
                    <Icon name="history" size={24} color={theme.colors.textMuted} />
                  </View>
                  <Text style={styles.emptyTitle}>История диалогов пуста</Text>
                  <Text style={styles.emptySubtitle}>
                    Задайте пожелания ассистенту, и маршруты автоматически сохранятся здесь.
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {savedSessions.map((session) => {
                    const isActive = activeSessionId === session.id;
                    const optionsCount = session.tripOptions?.length || 0;

                    return (
                      <View
                        key={session.id}
                        style={[styles.sessionCard, isActive && styles.sessionCardActive]}
                      >
                        <TouchableOpacity
                          style={styles.sessionCardBody}
                          onPress={() => handleSelect(session)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.sessionIconBox}>
                            <Icon name="sparkles" size={16} color={theme.colors.primary} />
                          </View>
                          <View style={styles.sessionTextCol}>
                            <Text
                              style={[
                                styles.sessionTitle,
                                isActive && styles.sessionTitleActive,
                              ]}
                              numberOfLines={2}
                            >
                              {session.title}
                            </Text>
                            <View style={styles.sessionMetaRow}>
                              <Text style={styles.sessionTime}>{formatDisplayTime(session.timestamp)}</Text>
                              {optionsCount > 0 && (
                                <View style={styles.optionsBadge}>
                                  <Text style={styles.optionsBadgeText}>
                                    {optionsCount}{" "}
                                    {optionsCount === 1 ? "вариант" : "варианта"}
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>

                        {onDeleteSession && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => onDeleteSession(session.id)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon name="trash" size={16} color={theme.colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
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
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: "88%",
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.textPrimary,
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
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  newChatButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  section: {
    gap: 10,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  list: {
    gap: 10,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },
  sessionCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  sessionCardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionTextCol: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    lineHeight: 18,
  },
  sessionTitleActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sessionTime: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  optionsBadge: {
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  optionsBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 8,
    marginLeft: 6,
  },
});

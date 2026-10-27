import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../common/Icon";
import { SavedMobileSession } from "../../hooks/useMobileAgent";
import { getTheme } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(320, SCREEN_WIDTH * 0.82);

export interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  savedSessions: SavedMobileSession[];
  activeSessionId?: string | null;
  onSelectSession: (session: SavedMobileSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
  activeAccount?: {
    name: string;
    avatarInitials: string;
    tier: string;
  };
  onOpenProfileOrAuth: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  visible,
  onClose,
  savedSessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  activeAccount,
  onOpenProfileOrAuth,
  isDark = false,
  onToggleTheme,
}) => {
  const insets = useSafeAreaInsets();
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(-DRAWER_WIDTH);
      fadeAnim.setValue(0);
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSelect = (session: SavedMobileSession) => {
    onSelectSession(session);
    handleClose();
  };

  const handleNewChat = () => {
    onNewChat();
    handleClose();
  };

  const handleProfilePress = () => {
    onOpenProfileOrAuth();
    handleClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Animated backdrop with subtle dim */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.45],
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={handleClose}
            accessibilityLabel="Закрыть меню"
          />
        </Animated.View>

        {/* Animated sliding sidebar from left */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: colors.surface,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Top Brand Bar matching Web Header #581C87 */}
          <View
            style={[
              styles.drawerHeader,
              {
                paddingTop: Math.max(insets.top, 14),
                backgroundColor: "#581C87",
              },
            ]}
          >
            <View style={styles.brandRow}>
              <View style={styles.brandLogoBox}>
                <Text style={styles.brandLogoText}>О!</Text>
              </View>
              <View style={styles.brandTextCol}>
                <Text style={styles.brandTitle}>О!дин запрос</Text>
                <Text style={styles.brandSubtitle}>travel AI-assistant</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Закрыть панель"
            >
              <Icon name="close" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* New Chat Action Button */}
          <View style={[styles.newChatWrapper, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.newChatButton,
                {
                  backgroundColor: isDark ? colors.surfaceContainer : colors.primaryLight,
                  borderColor: isDark ? colors.border : "rgba(88, 28, 135, 0.15)",
                },
              ]}
              onPress={handleNewChat}
              activeOpacity={0.8}
            >
              <View style={styles.newChatContent}>
                <View style={styles.newChatIconBox}>
                  <Icon name="plus" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.newChatText, { color: colors.textPrimary }]}>
                  Новый маршрут
                </Text>
              </View>
              <Icon name="arrow-right" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable list of saved sessions */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              История диалогов
            </Text>

            {savedSessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconBox,
                    { backgroundColor: colors.surfaceContainer },
                  ]}
                >
                  <Icon name="history" size={24} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  История диалогов пуста
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                  Задайте пожелания ассистенту, и маршруты автоматически сохранятся здесь.
                </Text>
              </View>
            ) : (
              <View style={styles.sessionList}>
                {savedSessions.map((session) => {
                  const isActive = activeSessionId === session.id;
                  const optionsCount = session.tripOptions?.length || 0;

                  return (
                    <View
                      key={session.id}
                      style={[
                        styles.sessionItem,
                        {
                          backgroundColor: isActive
                            ? isDark
                              ? colors.surfaceContainerHigh
                              : colors.surfaceContainer
                            : "transparent",
                          borderColor: isActive ? colors.border : "transparent",
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.sessionItemTouch}
                        onPress={() => handleSelect(session)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sessionIconBox}>
                          <Icon
                            name="sparkles"
                            size={14}
                            color={isActive ? colors.primary : colors.textMuted}
                          />
                        </View>
                        <View style={styles.sessionTextCol}>
                          <Text
                            style={[
                              styles.sessionTitle,
                              {
                                color: colors.textPrimary,
                                fontWeight: isActive ? "700" : "500",
                              },
                            ]}
                            numberOfLines={2}
                          >
                            {session.title}
                          </Text>
                          <View style={styles.sessionMetaRow}>
                            <Text style={[styles.sessionTime, { color: colors.textMuted }]}>
                              {session.timestamp}
                            </Text>
                            {optionsCount > 0 && (
                              <View
                                style={[
                                  styles.optionsCountBadge,
                                  { backgroundColor: colors.surfaceContainer },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.optionsCountText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  {optionsCount}{" "}
                                  {optionsCount === 1 ? "вариант" : "варианта"}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => onDeleteSession(session.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Удалить диалог"
                      >
                        <Icon name="trash" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer with Theme Switcher & Profile matching Web */}
          <View
            style={[
              styles.drawerFooter,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                backgroundColor: colors.surface,
                borderTopColor: colors.borderSubtle,
              },
            ]}
          >
            {/* Dark Mode Switcher Row */}
            {onToggleTheme && (
              <TouchableOpacity
                style={[
                  styles.themeToggleRow,
                  { backgroundColor: colors.surfaceContainer },
                ]}
                onPress={onToggleTheme}
                activeOpacity={0.75}
              >
                <View style={styles.themeToggleLeft}>
                  <Icon
                    name={isDark ? "sun" : "moon"}
                    size={16}
                    color={isDark ? "#F59E0B" : colors.primary}
                  />
                  <Text style={[styles.themeToggleLabel, { color: colors.textPrimary }]}>
                    {isDark ? "Светлая тема" : "Тёмная тема"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.themeToggleBadge,
                    {
                      backgroundColor: isDark ? "#F59E0B" : colors.primary,
                    },
                  ]}
                >
                  <Text style={styles.themeToggleBadgeText}>
                    {isDark ? "Вкл" : "Выкл"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Profile / Auth Button */}
            <TouchableOpacity
              style={[
                styles.profileButton,
                {
                  backgroundColor: isDark ? colors.surfaceContainer : colors.primaryLight,
                  borderColor: isDark ? colors.border : "rgba(88, 28, 135, 0.15)",
                },
              ]}
              onPress={handleProfilePress}
              activeOpacity={0.8}
            >
              <View style={styles.profileLeft}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {activeAccount?.avatarInitials || "ПУ"}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text
                    style={[styles.profileName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {activeAccount?.name || "Вход в аккаунт"}
                  </Text>
                  <Text
                    style={[styles.profileSubtitle, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {activeAccount?.tier
                      ? `Тариф ${activeAccount.tier.toUpperCase()}`
                      : "Сохранение маршрутов"}
                  </Text>
                </View>
              </View>
              <Icon name="settings" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
  },
  backdropTouch: {
    flex: 1,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    elevation: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    flexDirection: "column",
  },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogoText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  brandTextCol: {
    gap: 1,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  newChatWrapper: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  newChatContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  newChatIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  newChatText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    marginBottom: 8,
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  sessionList: {
    gap: 4,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  sessionItemTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
  },
  sessionIconBox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionTextCol: {
    flex: 1,
    gap: 3,
  },
  sessionTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionTime: {
    fontSize: 10,
  },
  optionsCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionsCountText: {
    fontSize: 10,
    fontWeight: "700",
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  drawerFooter: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  themeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  themeToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeToggleLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  themeToggleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  themeToggleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#581C87",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
    gap: 1,
  },
  profileName: {
    fontSize: 12,
    fontWeight: "700",
  },
  profileSubtitle: {
    fontSize: 10,
  },
});

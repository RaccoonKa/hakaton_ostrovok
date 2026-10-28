import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  TextInput,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "../common/Icon";
import { SavedMobileSession } from "../../hooks/useMobileAgent";
import { getTheme } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(270, Math.round(SCREEN_WIDTH * 0.78));

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
    email?: string;
    avatarInitials: string;
    tier?: string;
  };
  onOpenProfile?: () => void;
  onOpenAuth?: () => void;
  onOpenProfileOrAuth?: () => void;
  isDark?: boolean;
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
  onOpenProfile,
  onOpenAuth,
  onOpenProfileOrAuth,
  isDark = false,
}) => {
  const insets = useSafeAreaInsets();
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(visible);

  const slideAnim = useRef(new Animated.Value(visible ? 0 : -DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isMounted) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
        setSearchOpen(false);
        setSearchQuery("");
      });
    }
  }, [visible, isMounted, slideAnim, fadeAnim]);

  // Handle hardware back button on Android to close the in-tree drawer
  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => backSub.remove();
  }, [visible, onClose]);

  const handleClose = () => {
    onClose();
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
    if (onOpenProfile) {
      onOpenProfile();
    } else if (onOpenProfileOrAuth) {
      onOpenProfileOrAuth();
    }
    handleClose();
  };

  const handleAuthPress = () => {
    if (onOpenAuth) {
      onOpenAuth();
    } else if (onOpenProfileOrAuth) {
      onOpenProfileOrAuth();
    }
    handleClose();
  };

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return savedSessions;
    const lower = searchQuery.toLowerCase();
    return savedSessions.filter((s) => s.title.toLowerCase().includes(lower));
  }, [savedSessions, searchQuery]);

  if (!visible && !isMounted) return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <View style={styles.innerWrapper}>
        {/* Mobile backdrop with smooth fade (matching Web's data-sidebar-backdrop) */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
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

        {/* Sidebar Aside — matching Web's aside #main-sidebar 1:1 */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              backgroundColor: isDark ? "#151221" : "#FFFFFF",
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Continuous hardware-accelerated purple gradient top background matching Web */}
          <LinearGradient
            colors={[
              "rgba(92, 30, 134, 0.98)",
              "rgba(92, 30, 134, 0.93)",
              "rgba(92, 30, 134, 0.70)",
              "rgba(92, 30, 134, 0.38)",
              "rgba(92, 30, 134, 0.15)",
              "rgba(92, 30, 134, 0.04)",
              "rgba(92, 30, 134, 0.00)",
            ]}
            locations={[0, 0.28, 0.52, 0.70, 0.85, 0.94, 1.0]}
            style={styles.gradientHeader}
            pointerEvents="none"
          />

          {/* Top Brand Bar matching Web's h-14 Header */}
          <View
            style={[
              styles.brandBar,
              {
                paddingTop: Math.max(insets.top, 14),
              },
            ]}
          >
            {/* Brand Logo & Title */}
            <View style={styles.brandRow}>
              <View style={styles.brandLogoBox}>
                <Text style={styles.brandLogoText}>О!</Text>
              </View>
              <View style={styles.brandTextCol}>
                <Text style={styles.brandTitle}>О!дин запрос</Text>
                <Text style={styles.brandSubtitle}>travel AI-assistant</Text>
              </View>
            </View>

            {/* Actions: Search & Close */}
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => setSearchOpen((prev) => !prev)}
                accessibilityLabel="Поиск по диалогам"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="search" size={15} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerBtn}
                onPress={handleClose}
                accessibilityLabel="Закрыть боковую панель"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="close" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Optional inline search bar if toggled */}
          {searchOpen && (
            <View style={styles.searchBarContainer}>
              <View
                style={[
                  styles.searchInputBox,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(255, 255, 255, 0.90)",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.15)"
                      : "rgba(0, 0, 0, 0.08)",
                  },
                ]}
              >
                <Icon name="search" size={13} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Поиск по диалогам..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Icon name="close" size={12} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* New route button section matching Web's px-3 pt-2.5 pb-1 */}
          <View style={styles.newRouteContainer}>
            <TouchableOpacity
              style={[
                styles.newRouteButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.10)"
                    : "rgba(255, 255, 255, 0.85)",
                  borderColor: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.06)",
                },
              ]}
              onPress={handleNewChat}
              activeOpacity={0.75}
            >
              <View style={styles.newRouteContent}>
                <Icon
                  name="plus"
                  size={15}
                  color={isDark ? "#C084FC" : "#581C87"}
                />
                <Text
                  style={[styles.newRouteText, { color: colors.textPrimary }]}
                >
                  Новый маршрут
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Dialog history feed matching Web's flex-1 overflow-y-auto px-2 py-2 space-y-1 */}
          <ScrollView
            style={styles.sessionsScrollView}
            contentContainerStyle={styles.sessionsScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredSessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {searchQuery ? "Ничего не найдено" : "История диалогов пуста"}
                </Text>
              </View>
            ) : (
              <View style={styles.sessionsList}>
                {filteredSessions.map((item) => {
                  const isActive = activeSessionId === item.id;

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.sessionItem,
                        {
                          backgroundColor: isActive
                            ? isDark
                              ? "rgba(255, 255, 255, 0.12)"
                              : "rgba(255, 255, 255, 0.90)"
                            : "transparent",
                          borderColor: isActive
                            ? isDark
                              ? "rgba(255, 255, 255, 0.08)"
                              : "rgba(0, 0, 0, 0.04)"
                            : "transparent",
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.sessionItemTouch}
                        onPress={() => handleSelect(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.sessionIconBox}>
                          <Icon
                            name="message-square"
                            size={14}
                            color={isDark ? "#C084FC" : "#581C87"}
                          />
                        </View>
                        <Text
                          style={[
                            styles.sessionTitle,
                            {
                              color: colors.textPrimary,
                              fontWeight: isActive ? "600" : "400",
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.sessionDeleteBtn}
                        onPress={() => onDeleteSession(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Удалить диалог"
                      >
                        <Icon name="trash" size={13} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Footer User & Settings — frosted glass footer matching Web 1:1 */}
          <View
            style={[
              styles.drawerFooter,
              {
                paddingBottom: Math.max(insets.bottom, 14),
                backgroundColor: isDark
                  ? "rgba(21, 18, 33, 0.95)"
                  : "rgba(255, 255, 255, 0.92)",
                borderTopColor: isDark
                  ? "rgba(255, 255, 255, 0.08)"
                  : "rgba(0, 0, 0, 0.06)",
              },
            ]}
          >
            {/* Authenticated user profile or unauthenticated login button matching Web */}
            {activeAccount?.name ? (
              <TouchableOpacity
                style={[
                  styles.profileRow,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.06)"
                      : "rgba(0, 0, 0, 0.02)",
                  },
                ]}
                onPress={handleProfilePress}
                activeOpacity={0.75}
              >
                <View style={styles.profileLeft}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>
                      {activeAccount.avatarInitials ||
                        activeAccount.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.profileTextCol}>
                    <Text
                      style={[
                        styles.profileName,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {activeAccount.name}
                    </Text>
                    <Text
                      style={[styles.profileTier, { color: colors.textMuted }]}
                      numberOfLines={1}
                    >
                      {activeAccount.email || "Подтверждённый аккаунт"}
                    </Text>
                  </View>
                </View>

                <View style={styles.settingsIconBox}>
                  <Icon name="settings" size={15} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.guestFooterRow}>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    {
                      flex: 1,
                      backgroundColor: isDark
                        ? "rgba(88, 28, 135, 0.25)"
                        : "rgba(88, 28, 135, 0.08)",
                      borderColor: isDark
                        ? "rgba(192, 132, 252, 0.25)"
                        : "rgba(88, 28, 135, 0.18)",
                    },
                  ]}
                  onPress={handleAuthPress}
                  activeOpacity={0.8}
                >
                  <View style={styles.loginLeft}>
                    <View style={styles.loginIconBox}>
                      <Icon name="log-in" size={14} color="#FFFFFF" />
                    </View>
                    <View style={styles.loginTextCol}>
                      <Text
                        style={[
                          styles.loginTitle,
                          { color: isDark ? "#C084FC" : "#581C87" },
                        ]}
                      >
                        Вход в аккаунт
                      </Text>
                      <Text
                        style={[styles.loginSubtitle, { color: colors.textMuted }]}
                      >
                        Сохранение диалогов
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.settingsBtnGuest,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.06)"
                        : "rgba(0, 0, 0, 0.04)",
                      borderColor: isDark
                        ? "rgba(255, 255, 255, 0.10)"
                        : "rgba(0, 0, 0, 0.08)",
                    },
                  ]}
                  onPress={handleProfilePress}
                  activeOpacity={0.7}
                  accessibilityLabel="Настройки приложения"
                >
                  <Icon name="settings" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    elevation: 9999,
  },
  innerWrapper: {
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
    elevation: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    flexDirection: "column",
    overflow: "hidden",
  },
  gradientHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 0,
  },
  brandBar: {
    position: "relative",
    zIndex: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogoText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  brandTextCol: {
    gap: 1,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 13,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarContainer: {
    position: "relative",
    zIndex: 10,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  searchInputBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  newRouteContainer: {
    position: "relative",
    zIndex: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  newRouteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  newRouteContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  newRouteText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sessionsScrollView: {
    flex: 1,
  },
  sessionsScrollContent: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 16,
  },
  emptyContainer: {
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    textAlign: "center",
  },
  sessionsList: {
    gap: 3,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sessionItemTouch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  sessionIconBox: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.8,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  sessionDeleteBtn: {
    padding: 4,
    opacity: 0.7,
  },
  drawerFooter: {
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 11,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
    minWidth: 0,
  },
  profileAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#581C87",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  profileTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  profileName: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  profileTier: {
    fontSize: 10,
    lineHeight: 13,
  },
  settingsIconBox: {
    padding: 4,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
  },
  loginLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  loginIconBox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#581C87",
    alignItems: "center",
    justifyContent: "center",
  },
  loginTextCol: {
    flex: 1,
    gap: 1,
  },
  loginTitle: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  loginSubtitle: {
    fontSize: 9,
    lineHeight: 12,
  },
  guestFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  settingsBtnGuest: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

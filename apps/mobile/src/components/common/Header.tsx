import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { Icon } from "./Icon";

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onNewChatPress?: () => void;
  onSettingsPress?: () => void;
  activeAccount?: {
    name: string;
    avatarInitials: string;
    tier: string;
    badgeColor?: string;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title = "О!дин запрос",
  subtitle = "Ассистент путешествий",
  showBack = false,
  onBackPress,
  onMenuPress,
  onNewChatPress,
  onSettingsPress,
  activeAccount,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {/* Left Actions */}
        <View style={styles.leftContainer}>
          {showBack ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onBackPress}
              accessibilityLabel="Назад"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Icon name="arrow-left" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.leftButtons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onMenuPress}
                accessibilityLabel="История диалогов"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Icon name="menu" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              {onNewChatPress && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={onNewChatPress}
                  accessibilityLabel="Очистить диалог"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Icon name="refresh" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Center Brand Title */}
        <View style={styles.centerContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right Status / Profile Indicator */}
        <View style={styles.rightContainer}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              activeAccount && styles.accountButton,
            ]}
            onPress={onSettingsPress}
            accessibilityLabel="Параметры и профиль"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            {activeAccount?.avatarInitials ? (
              <Text style={styles.avatarInitialsText}>{activeAccount.avatarInitials}</Text>
            ) : (
              <Icon name="user" size={17} color="#FFFFFF" />
            )}
            <View style={styles.headerDotOnline} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: theme.colors.headerBg, // #581C87
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.12)",
    ...theme.shadows.sm,
    zIndex: 50,
  },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
  },
  leftContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  leftButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  centerContainer: {
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rightContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  accountButton: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  avatarInitialsText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerDotOnline: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10B981",
    borderWidth: 1.5,
    borderColor: theme.colors.headerBg,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 1,
  },
});

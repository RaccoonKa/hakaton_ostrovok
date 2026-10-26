import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onNewChatPress?: () => void;
  onSettingsPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = "О!дин запрос",
  subtitle = "ИИ-помощник в путешествиях",
  showBack = false,
  onBackPress,
  onMenuPress,
  onNewChatPress,
  onSettingsPress,
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
            >
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.leftButtons}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onMenuPress}
                accessibilityLabel="История диалогов"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.iconText}>☰</Text>
              </TouchableOpacity>
              {onNewChatPress && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={onNewChatPress}
                  accessibilityLabel="Новый диалог"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.iconText}>✎</Text>
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

        {/* Right Status / Profile Indicator (Stitch Screen 1 & 2) */}
        <View style={styles.rightContainer}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={onSettingsPress}
            accessibilityLabel="Параметры и профиль"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarIcon}>👤</Text>
              <View style={styles.onlineDot} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
    zIndex: 50,
  },
  header: {
    height: 56,
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
    gap: 6,
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
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  backArrow: {
    fontSize: 20,
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  profileButton: {
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarIcon: {
    fontSize: 16,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: theme.colors.success,
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
});

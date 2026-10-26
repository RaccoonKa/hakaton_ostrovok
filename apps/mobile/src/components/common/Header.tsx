import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { theme } from "../../theme";
import { DemoBadge } from "./DemoBadge";

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onMenuPress?: () => void;
  onNewChatPress?: () => void;
  showDemoBadge?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = "О!дин запрос",
  subtitle = "ИИ-помощник в путешествиях",
  showBack = false,
  onBackPress,
  onMenuPress,
  onNewChatPress,
  showDemoBadge = true,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onBackPress}
            accessibilityLabel="Назад"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.leftButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onMenuPress}
              accessibilityLabel="Меню истории"
            >
              <Text style={styles.iconText}>☰</Text>
            </TouchableOpacity>
            {onNewChatPress && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onNewChatPress}
                accessibilityLabel="Новый диалог"
              >
                <Text style={styles.iconText}>✎</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.centerContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightContainer}>
        {showDemoBadge && <DemoBadge variant="tint" label="Демо" />}
        <View style={styles.avatarPill}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
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
    gap: 4,
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
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.canvasMuted,
  },
  backArrow: {
    fontSize: 20,
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
  iconText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  avatarPill: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
  },
});

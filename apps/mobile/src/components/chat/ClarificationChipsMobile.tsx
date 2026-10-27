import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme, getTheme } from "../../theme";
import { Icon } from "../common/Icon";
import { DEFAULT_CLARIFICATION_CHIPS } from "../../utils/filters";

export { DEFAULT_CLARIFICATION_CHIPS };

export interface ClarificationChipsMobileProps {
  chips?: string[];
  onSelectChip?: (text: string) => void;
  activeChip?: string | null;
  isDark?: boolean;
}

export const ClarificationChipsMobile: React.FC<ClarificationChipsMobileProps> = ({
  chips = [],
  onSelectChip,
  activeChip: externalActiveChip,
  isDark = false,
}) => {
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const [internalActive, setInternalActive] = useState<string | null>(null);
  const active = externalActiveChip !== undefined ? externalActiveChip : internalActive;

  const handlePress = (chipText: string) => {
    setInternalActive(chipText);
    onSelectChip?.(chipText);
  };

  return (
    <View style={styles.container}>
      {chips.map((chip) => {
        const isSelected = active === chip;
        const isCustomEdit = chip.includes("своими словами");

        return (
          <TouchableOpacity
            key={chip}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected
                  ? isDark ? "rgba(107, 70, 193, 0.25)" : theme.colors.primaryLight
                  : isDark ? colors.surfaceContainer : "#F0EDF1",
                borderColor: isSelected ? theme.colors.primary : colors.border,
              },
            ]}
            onPress={() => handlePress(chip)}
            activeOpacity={0.7}
          >
            {isSelected ? (
              <Icon name="check" size={13} color="#059669" />
            ) : isCustomEdit ? (
              <Icon name="edit" size={13} color={colors.textMuted} />
            ) : (
              <View style={[styles.bulletDot, { backgroundColor: colors.textMuted }]} />
            )}
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? theme.colors.primary : colors.textPrimary },
                isSelected && styles.chipTextSelected,
              ]}
              numberOfLines={2}
            >
              {chip}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer, // #F0EDF1
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryLight, // #FAF5FF
    borderColor: theme.colors.primary, // #581C87
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.textMuted,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
});

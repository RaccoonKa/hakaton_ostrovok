import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../theme";
import { Icon } from "../common/Icon";
import { DEFAULT_CLARIFICATION_CHIPS } from "../../utils/filters";

export { DEFAULT_CLARIFICATION_CHIPS };

export interface ClarificationChipsMobileProps {
  chips?: string[];
  onSelectChip?: (text: string) => void;
  activeChip?: string | null;
}

export const ClarificationChipsMobile: React.FC<ClarificationChipsMobileProps> = ({
  chips = DEFAULT_CLARIFICATION_CHIPS,
  onSelectChip,
  activeChip: externalActiveChip,
}) => {
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
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => handlePress(chip)}
            activeOpacity={0.7}
          >
            {isSelected ? (
              <Icon name="check" size={13} color="#059669" />
            ) : isCustomEdit ? (
              <Icon name="edit" size={13} color={theme.colors.textMuted} />
            ) : (
              <View style={styles.bulletDot} />
            )}
            <Text
              style={[styles.chipText, isSelected && styles.chipTextSelected]}
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

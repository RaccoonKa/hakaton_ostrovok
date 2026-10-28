import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";
import { SHARED_QUICK_CHIPS, SHARED_SUGGESTIONS } from "@corvax/shared";
import { theme } from "../../theme";

export interface QuickReplyChipsProps {
  chips?: readonly string[] | string[];
  onSelectChip: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const DEFAULT_QUICK_CHIPS: readonly string[] = [
  "Показать отели в ОАЭ",
  "Только прямые рейсы",
  "Сравнить отели",
  "А если на 2 дня позже?",
];

export const QuickReplyChips: React.FC<QuickReplyChipsProps> = ({
  chips = DEFAULT_QUICK_CHIPS,
  onSelectChip,
  style,
}) => {
  if (!chips || chips.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scrollView, style]}
      contentContainerStyle={styles.contentContainer}
    >
      {chips.map((chip, idx) => (
        <TouchableOpacity
          key={`${chip}-${idx}`}
          style={styles.chip}
          onPress={() => onSelectChip(chip)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipText}>{chip}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 48,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
});

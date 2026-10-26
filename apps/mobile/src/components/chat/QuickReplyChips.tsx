import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";
import { theme } from "../../theme";

export interface QuickReplyChipsProps {
  chips?: string[];
  onSelectChip: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const DEFAULT_QUICK_CHIPS = [
  "🏖️ Тёплое море в ноябре с ребёнком до 200 000 ₽",
  "⛷️ Горные лыжи в Сочи на двоих в январе",
  "🏛️ Выходные в Стамбуле: уютный бутик-отель",
  "🏨 Показать отели в ОАЭ",
  "⚖️ Сравнить отели",
  "📅 А если на 2 дня позже?",
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
    maxHeight: 44,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 4,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: theme.colors.surfaceContainerLow,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
});

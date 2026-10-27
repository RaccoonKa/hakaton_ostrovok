import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";
import { Icon } from "../common/Icon";

export interface TravelFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filterPrompt: string) => void;
}

export const TravelFiltersModal: React.FC<TravelFiltersModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
}) => {
  const insets = useSafeAreaInsets();
  const [budget, setBudget] = useState("200000");
  const [directFlightsOnly, setDirectFlightsOnly] = useState(true);
  const [duration, setDuration] = useState("7");
  const [mealPlan, setMealPlan] = useState("all_inclusive");

  const handleApply = () => {
    const mealText =
      mealPlan === "all_inclusive"
        ? "всё включено"
        : mealPlan === "breakfast"
        ? "только завтраки"
        : "любое питание";
    const flightText = directFlightsOnly ? "только прямой рейс" : "возможны пересадки";
    const budgetText = budget ? `бюджет до ${Number(budget).toLocaleString("ru-RU")} ₽` : "";

    const promptSummary = `Уточнить фильтры: ${flightText}, ${mealText}, ${duration} ночей${budgetText ? `, ${budgetText}` : ""}`;
    onApplyFilters(promptSummary);
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
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Параметры и фильтры подбора</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel="Закрыть"
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
            {/* Direct Flight Toggle */}
            <View style={styles.cardRow}>
              <View style={styles.cardRowTextCol}>
                <Text style={styles.cardRowTitle}>Только прямые авиарейсы</Text>
                <Text style={styles.cardRowSub}>
                  Исключить рейсы со стыковками и пересадками
                </Text>
              </View>
              <Switch
                value={directFlightsOnly}
                onValueChange={setDirectFlightsOnly}
                trackColor={{ false: "#D1D5DB", true: "#E9D5FF" }}
                thumbColor={directFlightsOnly ? theme.colors.primary : "#F3F4F6"}
              />
            </View>

            {/* Budget Chips */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCaption}>Бюджет поездки</Text>
              <View style={styles.chipsRow}>
                {[
                  { label: "до 150 000 ₽", val: "150000" },
                  { label: "до 200 000 ₽", val: "200000" },
                  { label: "до 300 000 ₽", val: "300000" },
                  { label: "Любой бюджет", val: "" },
                ].map((b) => {
                  const isSelected = budget === b.val;
                  return (
                    <TouchableOpacity
                      key={b.label}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setBudget(b.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Duration Chips */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCaption}>Длительность тура</Text>
              <View style={styles.chipsRow}>
                {[
                  { label: "Выходные (3–4 ночи)", val: "4" },
                  { label: "Неделя (7 ночей)", val: "7" },
                  { label: "10–14 ночей", val: "10" },
                ].map((d) => {
                  const isSelected = duration === d.val;
                  return (
                    <TouchableOpacity
                      key={d.label}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setDuration(d.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Meal Plan */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCaption}>Тип питания в отеле</Text>
              <View style={styles.chipsRow}>
                {[
                  { label: "Всё включено (All Inc)", val: "all_inclusive" },
                  { label: "Завтрак + ужин (HB)", val: "half_board" },
                  { label: "Только завтраки (BB)", val: "breakfast" },
                  { label: "Любое", val: "any" },
                ].map((m) => {
                  const isSelected = mealPlan === m.val;
                  return (
                    <TouchableOpacity
                      key={m.label}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setMealPlan(m.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Text style={styles.applyButtonText}>Применить фильтры к поиску</Text>
            </TouchableOpacity>
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
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    overflow: "hidden",
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
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
  closeBtnText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  scroll: {
    maxHeight: "100%",
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  cardRowTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  cardRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  cardRowSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...theme.shadows.sm,
  },
  sectionCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: {
    backgroundColor: theme.colors.primaryLight, // #FAF5FF
    borderColor: theme.colors.primary, // #581C87
  },
  chipText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  applyButton: {
    backgroundColor: theme.colors.primary, // #581C87
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    ...theme.shadows.md,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

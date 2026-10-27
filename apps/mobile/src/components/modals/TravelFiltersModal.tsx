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
import {
  ORIGIN_CITIES,
  DESTINATION_DIRECTIONS,
  DURATION_OPTIONS,
  BUDGET_OPTIONS,
  MEAL_OPTIONS,
  buildFilterPrompt,
} from "../../utils/filters";

export {
  ORIGIN_CITIES,
  DESTINATION_DIRECTIONS,
  DURATION_OPTIONS,
  BUDGET_OPTIONS,
  MEAL_OPTIONS,
  formatGuestsCount,
  buildFilterPrompt,
} from "../../utils/filters";

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

  const [originCity, setOriginCity] = useState("Москва");
  const [destination, setDestination] = useState("");
  const [directFlightsOnly, setDirectFlightsOnly] = useState(true);
  const [duration, setDuration] = useState("7");
  const [budget, setBudget] = useState("200000");
  const [mealPlan, setMealPlan] = useState("all_inclusive");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const handleReset = () => {
    setOriginCity("Москва");
    setDestination("");
    setDirectFlightsOnly(true);
    setDuration("7");
    setBudget("200000");
    setMealPlan("all_inclusive");
    setAdults(2);
    setChildren(0);
  };

  const handleApply = () => {
    const promptSummary = buildFilterPrompt({
      originCity,
      destination,
      directFlightsOnly,
      duration,
      budget,
      mealPlan,
      adults,
      children,
    });
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
            <View>
              <Text style={styles.headerTitle}>Параметры поездки</Text>
              <Text style={styles.headerSubtitle}>
                Фильтры перелёта, отеля и состава туристов
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleReset}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.resetBtn}
              >
                <Text style={styles.resetBtnText}>Сброс</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                accessibilityLabel="Закрыть"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Origin City (Откуда) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="plane" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionCaption}>Откуда (город вылета)</Text>
              </View>
              <View style={styles.chipsRow}>
                {ORIGIN_CITIES.map((c) => {
                  const isSelected = originCity === c.val;
                  return (
                    <TouchableOpacity
                      key={c.label}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setOriginCity(c.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Destination (Куда) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="compass" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionCaption}>Куда (направление)</Text>
              </View>
              <View style={styles.chipsRow}>
                {DESTINATION_DIRECTIONS.map((d) => {
                  const isSelected = destination === d.val;
                  return (
                    <TouchableOpacity
                      key={d.label}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => setDestination(d.val)}
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

            {/* 3. Direct Flight Toggle */}
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

            {/* 4. Guests (Adults and Children with +/- counters matching Web 1:1) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="user" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionCaption}>Состав туристов</Text>
              </View>

              {/* Adults counter */}
              <View style={styles.counterRow}>
                <View style={styles.counterLabelCol}>
                  <Text style={styles.counterMainLabel}>Взрослые</Text>
                  <Text style={styles.counterSubLabel}>(от 12 лет)</Text>
                </View>
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      adults <= 1 && styles.counterBtnDisabled,
                    ]}
                    disabled={adults <= 1}
                    onPress={() => setAdults((prev) => Math.max(1, prev - 1))}
                    activeOpacity={0.7}
                    accessibilityLabel="Уменьшить количество взрослых"
                  >
                    <Icon
                      name="minus"
                      size={14}
                      color={adults <= 1 ? theme.colors.textMuted : theme.colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{adults}</Text>
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      adults >= 8 && styles.counterBtnDisabled,
                    ]}
                    disabled={adults >= 8}
                    onPress={() => setAdults((prev) => Math.min(8, prev + 1))}
                    activeOpacity={0.7}
                    accessibilityLabel="Увеличить количество взрослых"
                  >
                    <Icon
                      name="plus"
                      size={14}
                      color={adults >= 8 ? theme.colors.textMuted : theme.colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Children counter */}
              <View style={[styles.counterRow, styles.counterRowDivider]}>
                <View style={styles.counterLabelCol}>
                  <Text style={styles.counterMainLabel}>Дети</Text>
                  <Text style={styles.counterSubLabel}>(до 11 лет)</Text>
                </View>
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      children <= 0 && styles.counterBtnDisabled,
                    ]}
                    disabled={children <= 0}
                    onPress={() => setChildren((prev) => Math.max(0, prev - 1))}
                    activeOpacity={0.7}
                    accessibilityLabel="Уменьшить количество детей"
                  >
                    <Icon
                      name="minus"
                      size={14}
                      color={children <= 0 ? theme.colors.textMuted : theme.colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{children}</Text>
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      children >= 6 && styles.counterBtnDisabled,
                    ]}
                    disabled={children >= 6}
                    onPress={() => setChildren((prev) => Math.min(6, prev + 1))}
                    activeOpacity={0.7}
                    accessibilityLabel="Увеличить количество детей"
                  >
                    <Icon
                      name="plus"
                      size={14}
                      color={children >= 6 ? theme.colors.textMuted : theme.colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 5. Budget Chips */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="sparkles" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionCaption}>Бюджет поездки</Text>
              </View>
              <View style={styles.chipsRow}>
                {BUDGET_OPTIONS.map((b) => {
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

            {/* 6. Duration Chips */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="calendar" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionCaption}>Длительность тура</Text>
              </View>
              <View style={styles.chipsRow}>
                {DURATION_OPTIONS.map((d) => {
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

            {/* 7. Meal Plan */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Icon name="restaurant" size={14} color={theme.colors.primary} />
                <Text style={styles.sectionCaption}>Тип питания в отеле</Text>
              </View>
              <View style={styles.chipsRow}>
                {MEAL_OPTIONS.map((m) => {
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
              <Icon name="check" size={17} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Применить параметры</Text>
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
    maxHeight: "90%",
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
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  resetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    maxHeight: "100%",
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
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
    gap: 8,
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
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
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
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  counterRowDivider: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
    marginTop: 4,
    paddingTop: 8,
  },
  counterLabelCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  counterMainLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  counterSubLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  counterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnDisabled: {
    opacity: 0.35,
  },
  counterValue: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    minWidth: 18,
    textAlign: "center",
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 6,
    ...theme.shadows.md,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

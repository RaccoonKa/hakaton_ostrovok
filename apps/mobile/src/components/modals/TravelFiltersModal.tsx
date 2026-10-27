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
import { theme, getTheme } from "../../theme";
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
  isDark?: boolean;
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const MONTH_NAMES_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const TravelFiltersModal: React.FC<TravelFiltersModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
  isDark = false,
}) => {
  const insets = useSafeAreaInsets();
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calendar dates state
  const [viewDate, setViewDate] = useState<Date>(() => new Date(today));
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Other travel options state
  const [originCity, setOriginCity] = useState("Москва");
  const [destination, setDestination] = useState("");
  const [directFlightsOnly, setDirectFlightsOnly] = useState(true);
  const [duration, setDuration] = useState("7");
  const [budget, setBudget] = useState("200000");
  const [mealPlan, setMealPlan] = useState("all_inclusive");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setViewDate(new Date(today));
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
      startDate,
      endDate,
    });
    onApplyFilters(promptSummary);
    onClose();
  };

  // Calendar calculations
  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const isSameDay = (d1: Date | null, d2: Date | null) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const isBetween = (target: Date, start: Date | null, end: Date | null) => {
    if (!start || !end) return false;
    const t = target.getTime();
    const s = Math.min(start.getTime(), end.getTime());
    const e = Math.max(start.getTime(), end.getTime());
    return t > s && t < e;
  };

  const handleDateClick = (dayDate: Date) => {
    if (dayDate.getTime() < today.getTime()) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(dayDate);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (dayDate.getTime() < startDate.getTime()) {
        setStartDate(dayDate);
      } else {
        setEndDate(dayDate);
      }
    }
  };

  const calendarCells = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    calendarCells.push({ day, isCurrentMonth: false, isPast: true, date: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(currentYear, currentMonth, d);
    dayDate.setHours(0, 0, 0, 0);
    const isPast = dayDate.getTime() < today.getTime();
    calendarCells.push({ day: d, isCurrentMonth: true, isPast, date: dayDate });
  }

  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({ day: i, isCurrentMonth: false, isPast: true, date: null });
  }

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
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.borderSubtle,
              },
            ]}
          >
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Параметры поездки
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
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
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted },
                ]}
                onPress={onClose}
                accessibilityLabel="Закрыть"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Dates (Mini Calendar) */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Icon name="calendar" size={14} color={theme.colors.primary} />
                <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
                  Даты вылета и возвращения
                </Text>
              </View>

              {/* Month navigation header */}
              <View style={styles.monthNavRow}>
                <Text style={[styles.monthNavTitle, { color: colors.textPrimary }]}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </Text>
                <View style={styles.monthNavButtons}>
                  <TouchableOpacity
                    onPress={handlePrevMonth}
                    style={[
                      styles.monthNavBtn,
                      { backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted },
                    ]}
                    accessibilityLabel="Предыдущий месяц"
                  >
                    <Icon name="chevron-left" size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleNextMonth}
                    style={[
                      styles.monthNavBtn,
                      { backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted },
                    ]}
                    accessibilityLabel="Следующий месяц"
                  >
                    <Icon name="chevron-right" size={14} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Weekdays */}
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((wd) => (
                  <Text
                    key={wd}
                    style={[styles.weekdayText, { color: colors.textMuted }]}
                  >
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Day cells grid */}
              <View style={styles.calendarGrid}>
                {calendarCells.map((cell, idx) => {
                  if (!cell.isCurrentMonth || !cell.date) {
                    return (
                      <View key={`empty-${idx}`} style={styles.calendarDayCell}>
                        <Text style={[styles.dayTextInactive, { color: isDark ? "#4B4668" : "#D1D5DB" }]}>
                          {cell.day}
                        </Text>
                      </View>
                    );
                  }

                  const dayDate = cell.date;
                  const isStart = isSameDay(dayDate, startDate);
                  const isEnd = isSameDay(dayDate, endDate);
                  const inRange = isBetween(dayDate, startDate, endDate);
                  const isToday = isSameDay(dayDate, today);

                  return (
                    <TouchableOpacity
                      key={`day-${cell.day}`}
                      disabled={cell.isPast}
                      onPress={() => handleDateClick(dayDate)}
                      style={[
                        styles.calendarDayCell,
                        isStart && styles.dayCellStart,
                        isEnd && styles.dayCellEnd,
                        inRange && [
                          styles.dayCellRange,
                          { backgroundColor: isDark ? "rgba(107, 70, 193, 0.3)" : "#EDE9FE" },
                        ],
                        isToday && !isStart && !isEnd && [
                          styles.dayCellToday,
                          { borderColor: theme.colors.primary },
                        ],
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          { color: colors.textPrimary },
                          cell.isPast && { color: isDark ? "#4B4668" : "#9CA3AF" },
                          (isStart || isEnd) && styles.dayTextSelected,
                          inRange && { color: theme.colors.primary, fontWeight: "700" },
                        ]}
                      >
                        {cell.day}
                      </Text>
                      {isStart && <Text style={styles.dayBadge}>от</Text>}
                      {isEnd && <Text style={styles.dayBadge}>до</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Date Summary / Clear Row */}
              <View style={styles.dateSummaryRow}>
                <Text style={[styles.dateSummaryText, { color: colors.textSecondary }]}>
                  {startDate && endDate
                    ? `${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]} — ${endDate.getDate()} ${MONTH_NAMES_GENITIVE[endDate.getMonth()]}`
                    : startDate
                    ? `с ${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]}`
                    : "Точные даты не выбраны (выберите на календаре или укажите длительность)"}
                </Text>
                {startDate && (
                  <TouchableOpacity
                    onPress={() => {
                      setStartDate(null);
                      setEndDate(null);
                    }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.clearDateText}>Очистить</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 2. Origin City (Откуда) */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Icon name="plane" size={14} color={theme.colors.primary} />
                <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
                  Откуда (город вылета)
                </Text>
              </View>
              <View style={styles.chipsRow}>
                {ORIGIN_CITIES.map((c) => {
                  const isSelected = originCity === c.val;
                  return (
                    <TouchableOpacity
                      key={c.label}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? isDark ? "rgba(107, 70, 193, 0.25)" : theme.colors.primaryLight
                            : isDark ? colors.surfaceContainer : colors.surface,
                          borderColor: isSelected ? theme.colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setOriginCity(c.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.colors.primary : colors.textPrimary },
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

            {/* 3. Destination (Куда) */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Icon name="compass" size={14} color={theme.colors.primary} />
                <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
                  Куда (направление)
                </Text>
              </View>
              <View style={styles.chipsRow}>
                {DESTINATION_DIRECTIONS.map((d) => {
                  const isSelected = destination === d.val;
                  return (
                    <TouchableOpacity
                      key={d.label}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? isDark ? "rgba(107, 70, 193, 0.25)" : theme.colors.primaryLight
                            : isDark ? colors.surfaceContainer : colors.surface,
                          borderColor: isSelected ? theme.colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setDestination(d.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.colors.primary : colors.textPrimary },
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

            {/* 4. Direct Flight Toggle */}
            <View
              style={[
                styles.cardRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.cardRowTextCol}>
                <Text style={[styles.cardRowTitle, { color: colors.textPrimary }]}>
                  Только прямые авиарейсы
                </Text>
                <Text style={[styles.cardRowSub, { color: colors.textMuted }]}>
                  Исключить рейсы со стыковками и пересадками
                </Text>
              </View>
              <Switch
                value={directFlightsOnly}
                onValueChange={setDirectFlightsOnly}
                trackColor={{
                  false: isDark ? "#3A3552" : "#D1D5DB",
                  true: isDark ? "#6B46C1" : "#E9D5FF",
                }}
                thumbColor={directFlightsOnly ? theme.colors.primary : (isDark ? "#A09BB8" : "#F3F4F6")}
              />
            </View>

            {/* 5. Guests (Adults and Children with +/- counters) */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Icon name="user" size={14} color={theme.colors.primary} />
                <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
                  Состав туристов
                </Text>
              </View>

              {/* Adults counter */}
              <View style={styles.counterRow}>
                <View style={styles.counterLabelCol}>
                  <Text style={[styles.counterMainLabel, { color: colors.textPrimary }]}>
                    Взрослые
                  </Text>
                  <Text style={[styles.counterSubLabel, { color: colors.textMuted }]}>
                    (от 12 лет)
                  </Text>
                </View>
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      {
                        backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                        borderColor: colors.border,
                      },
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
                      color={adults <= 1 ? colors.textMuted : colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.counterValue, { color: colors.textPrimary }]}>
                    {adults}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      {
                        backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                        borderColor: colors.border,
                      },
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
                      color={adults >= 8 ? colors.textMuted : colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Children counter */}
              <View
                style={[
                  styles.counterRow,
                  styles.counterRowDivider,
                  { borderTopColor: colors.borderSubtle },
                ]}
              >
                <View style={styles.counterLabelCol}>
                  <Text style={[styles.counterMainLabel, { color: colors.textPrimary }]}>
                    Дети
                  </Text>
                  <Text style={[styles.counterSubLabel, { color: colors.textMuted }]}>
                    (до 11 лет)
                  </Text>
                </View>
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      {
                        backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                        borderColor: colors.border,
                      },
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
                      color={children <= 0 ? colors.textMuted : colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.counterValue, { color: colors.textPrimary }]}>
                    {children}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.counterBtn,
                      {
                        backgroundColor: isDark ? colors.surfaceContainer : colors.canvasMuted,
                        borderColor: colors.border,
                      },
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
                      color={children >= 6 ? colors.textMuted : colors.textPrimary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 6. Budget Chips */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Icon name="sparkles" size={14} color={theme.colors.primary} />
                <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
                  Бюджет поездки
                </Text>
              </View>
              <View style={styles.chipsRow}>
                {BUDGET_OPTIONS.map((b) => {
                  const isSelected = budget === b.val;
                  return (
                    <TouchableOpacity
                      key={b.label}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? isDark ? "rgba(107, 70, 193, 0.25)" : theme.colors.primaryLight
                            : isDark ? colors.surfaceContainer : colors.surface,
                          borderColor: isSelected ? theme.colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setBudget(b.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.colors.primary : colors.textPrimary },
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

            {/* 7. Duration Chips */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Icon name="calendar" size={14} color={theme.colors.primary} />
                <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
                  Длительность тура
                </Text>
              </View>
              <View style={styles.chipsRow}>
                {DURATION_OPTIONS.map((d) => {
                  const isSelected = duration === d.val;
                  return (
                    <TouchableOpacity
                      key={d.label}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? isDark ? "rgba(107, 70, 193, 0.25)" : theme.colors.primaryLight
                            : isDark ? colors.surfaceContainer : colors.surface,
                          borderColor: isSelected ? theme.colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setDuration(d.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.colors.primary : colors.textPrimary },
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

            {/* 8. Meal Plan */}
            <View
              style={[
                styles.sectionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Icon name="restaurant" size={14} color={theme.colors.primary} />
                <Text style={[styles.sectionCaption, { color: colors.textMuted }]}>
                  Тип питания в отеле
                </Text>
              </View>
              <View style={styles.chipsRow}>
                {MEAL_OPTIONS.map((m) => {
                  const isSelected = mealPlan === m.val;
                  return (
                    <TouchableOpacity
                      key={m.label}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? isDark ? "rgba(107, 70, 193, 0.25)" : theme.colors.primaryLight
                            : isDark ? colors.surfaceContainer : colors.surface,
                          borderColor: isSelected ? theme.colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setMealPlan(m.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? theme.colors.primary : colors.textPrimary },
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
    backgroundColor: "rgba(0, 0, 0, 0.65)",
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
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  monthNavTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  monthNavButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  monthNavBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.textMuted,
    width: "14%",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  calendarDayCell: {
    width: "14.28%",
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderRadius: 6,
  },
  dayCellStart: {
    backgroundColor: theme.colors.primary,
  },
  dayCellEnd: {
    backgroundColor: theme.colors.primary,
  },
  dayCellRange: {
    backgroundColor: "rgba(107, 70, 193, 0.2)",
    borderRadius: 0,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textPrimary,
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayTextInactive: {
    fontSize: 11,
    color: "#D1D5DB",
  },
  dayBadge: {
    position: "absolute",
    top: -2,
    right: 2,
    fontSize: 7,
    fontWeight: "800",
    color: "#FFFFFF",
    backgroundColor: "#3B0764",
    paddingHorizontal: 2,
    borderRadius: 3,
  },
  dateSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(150, 150, 150, 0.2)",
  },
  dateSummaryText: {
    fontSize: 11,
    fontWeight: "500",
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: 6,
  },
  clearDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.primary,
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
  chipText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: theme.colors.primary,
    fontWeight: "700",
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

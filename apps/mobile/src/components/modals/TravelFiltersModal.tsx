import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  BackHandler,
} from "react-native";
import { formatFilterQuery } from "@corvax/shared";
import { getTheme } from "../../theme";
import { Icon } from "../common/Icon";

export {
  ORIGIN_CITIES,
  DESTINATION_DIRECTIONS,
  DURATION_OPTIONS,
  BUDGET_OPTIONS,
  MEAL_OPTIONS,
  formatGuestsCount,
  buildFilterPrompt,
} from "../../utils/filters";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface TravelFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filterPrompt: string) => void;
  isDark?: boolean;
}

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const MONTH_NAMES_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const MIN_POSSIBLE_BUDGET = 20000;
const MAX_POSSIBLE_BUDGET = 1000000;
const BUDGET_STEP_MIN = 10000;
const BUDGET_STEP_MAX = 20000;

function formatRubles(amount: number): string {
  return amount.toLocaleString("ru-RU") + " ₽";
}

export const TravelFiltersModal: React.FC<TravelFiltersModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
  isDark = false,
}) => {
  const currentTheme = getTheme(isDark);
  const colors = currentTheme.colors;

  const today = useRef(new Date()).current;
  today.setHours(0, 0, 0, 0);

  // Dates state (matching Web SearchFiltersPopover)
  const [viewDate, setViewDate] = useState<Date>(() => new Date(today));
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Budget state (matching Web SearchFiltersPopover defaults)
  const [minBudget, setMinBudget] = useState<number>(40000);
  const [maxBudget, setMaxBudget] = useState<number>(180000);

  // Guests state (matching Web SearchFiltersPopover defaults)
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // Smooth in-tree animation state
  const [isMounted, setIsMounted] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(visible ? 1 : 0.95)).current;

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isMounted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [visible, isMounted, fadeAnim, scaleAnim]);

  // Android hardware back button handler
  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => backSub.remove();
  }, [visible, onClose]);

  if (!visible && !isMounted) return null;

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

  const handleApply = () => {
    const formattedText = formatFilterQuery({
      startDate,
      endDate,
      minBudget,
      maxBudget,
      adults,
      children,
    });

    onApplyFilters(formattedText);
    onClose();
  };

  // Calendar cells
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

  // Budget progress percentage
  const trackMinPct = Math.max(
    0,
    Math.min(
      100,
      ((minBudget - MIN_POSSIBLE_BUDGET) / (MAX_POSSIBLE_BUDGET - MIN_POSSIBLE_BUDGET)) * 100
    )
  );
  const trackMaxPct = Math.max(
    0,
    Math.min(
      100,
      ((maxBudget - MIN_POSSIBLE_BUDGET) / (MAX_POSSIBLE_BUDGET - MIN_POSSIBLE_BUDGET)) * 100
    )
  );

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.rootOverlay]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Закрыть параметры поездки"
        />
      </Animated.View>

      {/* Popover Card (matching Web SearchFiltersPopover 1:1) */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            backgroundColor: isDark ? "#1C182C" : "#FFFFFF",
            borderColor: isDark ? "#383152" : "#E2E8F0",
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* 1. Header matching Web 1:1 */}
          <View
            style={[
              styles.cardHeader,
              { borderBottomColor: isDark ? "#2D2744" : "rgba(0, 0, 0, 0.06)" },
            ]}
          >
            <Text
              style={[
                styles.headerTitle,
                { color: isDark ? "#FFFFFF" : colors.textPrimary },
              ]}
            >
              ПАРАМЕТРЫ ПОЕЗДКИ
            </Text>
            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.05)",
                },
              ]}
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Закрыть"
            >
              <Icon name="close" size={14} color={isDark ? "#D8B4FE" : colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* 2. Top Block: Mini-Calendar matching Web 1:1 */}
          <View
            style={[
              styles.sectionBox,
              {
                backgroundColor: isDark ? "#231E38" : "rgba(241, 245, 249, 0.65)",
                borderColor: isDark ? "#322A4D" : "rgba(226, 232, 240, 0.8)",
              },
            ]}
          >
            {/* Month & Navigation */}
            <View style={styles.calendarHeaderRow}>
              <View style={styles.monthTitleBox}>
                <Icon name="calendar" size={14} color="#7C3AED" />
                <Text
                  style={[
                    styles.monthTitleText,
                    { color: isDark ? "#FFFFFF" : colors.textPrimary },
                  ]}
                >
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </Text>
              </View>

              <View style={styles.monthNavActions}>
                <TouchableOpacity
                  style={[
                    styles.monthNavBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "#FFFFFF",
                    },
                  ]}
                  onPress={handlePrevMonth}
                  accessibilityLabel="Предыдущий месяц"
                >
                  <Icon
                    name="chevron-left"
                    size={13}
                    color={isDark ? "#D8B4FE" : colors.textMuted}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.monthNavBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255, 255, 255, 0.08)"
                        : "#FFFFFF",
                    },
                  ]}
                  onPress={handleNextMonth}
                  accessibilityLabel="Следующий месяц"
                >
                  <Icon
                    name="chevron-right"
                    size={13}
                    color={isDark ? "#D8B4FE" : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekdays */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((wd) => (
                <Text key={wd} style={styles.weekdayText}>
                  {wd}
                </Text>
              ))}
            </View>

            {/* Calendar Grid (7 columns) */}
            <View style={styles.calendarGrid}>
              {calendarCells.map((cell, idx) => {
                if (!cell.isCurrentMonth || !cell.date) {
                  return (
                    <View key={`empty-${idx}`} style={styles.cellEmpty}>
                      <Text style={styles.cellEmptyText}>{cell.day}</Text>
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
                      styles.cellButton,
                      cell.isPast && styles.cellPast,
                      (isStart || isEnd) && styles.cellSelected,
                      inRange && (isDark ? styles.cellRangeDark : styles.cellRangeLight),
                      isToday && !isStart && !isEnd && styles.cellToday,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.cellText,
                        { color: isDark ? "#FFFFFF" : colors.textPrimary },
                        cell.isPast && styles.cellTextPast,
                        (isStart || isEnd) && styles.cellTextSelected,
                        inRange && (isDark ? styles.cellTextRangeDark : styles.cellTextRangeLight),
                      ]}
                    >
                      {cell.day}
                    </Text>

                    {isStart && (
                      <View style={styles.badgeLabel}>
                        <Text style={styles.badgeText}>от</Text>
                      </View>
                    )}
                    {isEnd && (
                      <View style={styles.badgeLabel}>
                        <Text style={styles.badgeText}>до</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Date Summary Row matching Web 1:1 */}
            <View style={styles.dateSummaryRow}>
              <Text
                style={[
                  styles.dateSummaryText,
                  { color: isDark ? "#C084FC" : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {startDate && endDate
                  ? `${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]} — ${endDate.getDate()} ${MONTH_NAMES_GENITIVE[endDate.getMonth()]}`
                  : startDate
                  ? `с ${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]}`
                  : "Даты не выбраны"}
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

          {/* 3. Middle Block: Budget matching Web 1:1 */}
          <View
            style={[
              styles.sectionBox,
              {
                backgroundColor: isDark ? "#231E38" : "rgba(241, 245, 249, 0.65)",
                borderColor: isDark ? "#322A4D" : "rgba(226, 232, 240, 0.8)",
              },
            ]}
          >
            <View style={styles.budgetHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Icon name="dollar" size={13} color="#7C3AED" />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: isDark ? "#FFFFFF" : colors.textPrimary },
                  ]}
                >
                  Бюджет
                </Text>
              </View>
              <Text
                style={[
                  styles.budgetAmountText,
                  { color: isDark ? "#C084FC" : "#581C87" },
                ]}
              >
                {formatRubles(minBudget)} — {formatRubles(maxBudget)}
              </Text>
            </View>

            {/* Interactive Visual Range Track */}
            <View style={styles.rangeTrackContainer}>
              <View
                style={[
                  styles.rangeTrackBg,
                  { backgroundColor: isDark ? "#342B52" : "#E2E8F0" },
                ]}
              >
                <View
                  style={[
                    styles.rangeTrackFill,
                    {
                      left: `${trackMinPct}%`,
                      width: `${Math.max(4, trackMaxPct - trackMinPct)}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Steppers for fine-tuning */}
            <View style={styles.budgetSteppersRow}>
              {/* Min budget stepper */}
              <View style={styles.stepperSubGroup}>
                <Text style={styles.stepperSubLabel}>От:</Text>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    {
                      backgroundColor: isDark ? "#2E2747" : "#FFFFFF",
                      borderColor: isDark ? "#3D345A" : "#E2E8F0",
                    },
                  ]}
                  disabled={minBudget <= MIN_POSSIBLE_BUDGET}
                  onPress={() =>
                    setMinBudget((prev) => Math.max(MIN_POSSIBLE_BUDGET, prev - BUDGET_STEP_MIN))
                  }
                >
                  <Icon name="minus" size={10} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    {
                      backgroundColor: isDark ? "#2E2747" : "#FFFFFF",
                      borderColor: isDark ? "#3D345A" : "#E2E8F0",
                    },
                  ]}
                  disabled={minBudget >= maxBudget - BUDGET_STEP_MIN}
                  onPress={() =>
                    setMinBudget((prev) => Math.min(maxBudget - BUDGET_STEP_MIN, prev + BUDGET_STEP_MIN))
                  }
                >
                  <Icon name="plus" size={10} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Max budget stepper */}
              <View style={styles.stepperSubGroup}>
                <Text style={styles.stepperSubLabel}>До:</Text>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    {
                      backgroundColor: isDark ? "#2E2747" : "#FFFFFF",
                      borderColor: isDark ? "#3D345A" : "#E2E8F0",
                    },
                  ]}
                  disabled={maxBudget <= minBudget + BUDGET_STEP_MAX}
                  onPress={() =>
                    setMaxBudget((prev) => Math.max(minBudget + BUDGET_STEP_MAX, prev - BUDGET_STEP_MAX))
                  }
                >
                  <Icon name="minus" size={10} color={colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.stepperBtn,
                    {
                      backgroundColor: isDark ? "#2E2747" : "#FFFFFF",
                      borderColor: isDark ? "#3D345A" : "#E2E8F0",
                    },
                  ]}
                  disabled={maxBudget >= MAX_POSSIBLE_BUDGET}
                  onPress={() =>
                    setMaxBudget((prev) => Math.min(MAX_POSSIBLE_BUDGET, prev + BUDGET_STEP_MAX))
                  }
                >
                  <Icon name="plus" size={10} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick budget chips matching Web 1:1 */}
            <View style={styles.chipsScrollRow}>
              {[
                { label: "до 150 тыс.", min: 20000, max: 150000 },
                { label: "до 300 тыс.", min: 40000, max: 300000 },
                { label: "до 500 тыс.", min: 50000, max: 500000 },
                { label: "до 1 млн", min: 100000, max: 1000000 },
              ].map((chip) => {
                const isActive = minBudget === chip.min && maxBudget === chip.max;
                return (
                  <TouchableOpacity
                    key={chip.label}
                    onPress={() => {
                      setMinBudget(chip.min);
                      setMaxBudget(chip.max);
                    }}
                    style={[
                      styles.chipButton,
                      {
                        backgroundColor: isActive
                          ? isDark
                            ? "rgba(192, 132, 252, 0.25)"
                            : "rgba(88, 28, 135, 0.12)"
                          : isDark
                          ? "#2B2542"
                          : "#FFFFFF",
                        borderColor: isActive
                          ? isDark
                            ? "#C084FC"
                            : "#581C87"
                          : isDark
                          ? "#3D345A"
                          : "#E2E8F0",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isActive
                            ? isDark
                              ? "#FFFFFF"
                              : "#581C87"
                            : isDark
                            ? "#D8B4FE"
                            : colors.textSecondary,
                          fontWeight: isActive ? "700" : "600",
                        },
                      ]}
                    >
                      {chip.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* 4. Bottom Block: Guests matching Web 1:1 */}
          <View
            style={[
              styles.sectionBox,
              {
                backgroundColor: isDark ? "#231E38" : "rgba(241, 245, 249, 0.65)",
                borderColor: isDark ? "#322A4D" : "rgba(226, 232, 240, 0.8)",
              },
            ]}
          >
            <View style={styles.sectionHeaderLeft}>
              <Icon name="users" size={13} color="#7C3AED" />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: isDark ? "#FFFFFF" : colors.textPrimary },
                ]}
              >
                Гости
              </Text>
            </View>

            {/* Adults Row */}
            <View style={styles.guestRow}>
              <View style={styles.guestLabelCol}>
                <Text
                  style={[
                    styles.guestTitle,
                    { color: isDark ? "#FFFFFF" : colors.textPrimary },
                  ]}
                >
                  Взрослые
                </Text>
                <Text
                  style={[
                    styles.guestSubtitle,
                    { color: isDark ? "rgba(216, 180, 254, 0.7)" : colors.textMuted },
                  ]}
                >
                  (от 12 лет)
                </Text>
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    {
                      backgroundColor: isDark ? "#2E2747" : "#FFFFFF",
                      borderColor: isDark ? "#3D345A" : "#E2E8F0",
                      opacity: adults <= 1 ? 0.35 : 1,
                    },
                  ]}
                  disabled={adults <= 1}
                  onPress={() => setAdults((prev) => Math.max(1, prev - 1))}
                >
                  <Icon name="minus" size={11} color={colors.textPrimary} />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.counterValue,
                    { color: isDark ? "#FFFFFF" : colors.textPrimary },
                  ]}
                >
                  {adults}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    {
                      backgroundColor: isDark ? "#2E2747" : "#FFFFFF",
                      borderColor: isDark ? "#3D345A" : "#E2E8F0",
                      opacity: adults >= 8 ? 0.35 : 1,
                    },
                  ]}
                  disabled={adults >= 8}
                  onPress={() => setAdults((prev) => Math.min(8, prev + 1))}
                >
                  <Icon name="plus" size={11} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Children Row */}
            <View
              style={[
                styles.guestRow,
                styles.guestRowBorderTop,
                { borderTopColor: isDark ? "#2D2744" : "rgba(0,0,0,0.06)" },
              ]}
            >
              <View style={styles.guestLabelCol}>
                <Text
                  style={[
                    styles.guestTitle,
                    { color: isDark ? "#FFFFFF" : colors.textPrimary },
                  ]}
                >
                  Дети
                </Text>
                <Text
                  style={[
                    styles.guestSubtitle,
                    { color: isDark ? "rgba(216, 180, 254, 0.7)" : colors.textMuted },
                  ]}
                >
                  (до 11 лет)
                </Text>
              </View>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    {
                      backgroundColor: isDark ? "#2E2747" : "#FFFFFF",
                      borderColor: isDark ? "#3D345A" : "#E2E8F0",
                      opacity: children <= 0 ? 0.35 : 1,
                    },
                  ]}
                  disabled={children <= 0}
                  onPress={() => setChildren((prev) => Math.max(0, prev - 1))}
                >
                  <Icon name="minus" size={11} color={colors.textPrimary} />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.counterValue,
                    { color: isDark ? "#FFFFFF" : colors.textPrimary },
                  ]}
                >
                  {children}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.counterBtn,
                    {
                      backgroundColor: isDark ? "#2E2747" : "#FFFFFF",
                      borderColor: isDark ? "#3D345A" : "#E2E8F0",
                      opacity: children >= 6 ? 0.35 : 1,
                    },
                  ]}
                  disabled={children >= 6}
                  onPress={() => setChildren((prev) => Math.min(6, prev + 1))}
                >
                  <Icon name="plus" size={11} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 5. Footer Action matching Web 1:1 */}
          <View style={styles.footerActionBox}>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Icon name="check" size={14} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Применить параметры</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootOverlay: {
    zIndex: 9999,
    elevation: 9999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000",
  },
  backdropTouch: {
    flex: 1,
  },
  cardContainer: {
    width: Math.min(340, SCREEN_WIDTH - 24),
    maxHeight: "86%",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 20,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBox: {
    borderRadius: 13,
    borderWidth: 1,
    padding: 9,
    gap: 6,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthTitleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  monthTitleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  monthNavActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  monthNavBtn: {
    width: 22,
    height: 22,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 2,
  },
  weekdayText: {
    width: 28,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 3,
  },
  cellEmpty: {
    width: "14.28%",
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmptyText: {
    fontSize: 10,
    color: "rgba(148, 163, 184, 0.3)",
  },
  cellButton: {
    width: "14.28%",
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cellPast: {
    opacity: 0.3,
  },
  cellSelected: {
    backgroundColor: "#581C87",
  },
  cellRangeLight: {
    backgroundColor: "rgba(88, 28, 135, 0.15)",
    borderRadius: 0,
  },
  cellRangeDark: {
    backgroundColor: "rgba(168, 85, 247, 0.25)",
    borderRadius: 0,
  },
  cellToday: {
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.5)",
  },
  cellText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cellTextPast: {
    color: "#94A3B8",
  },
  cellTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  cellTextRangeLight: {
    color: "#581C87",
    fontWeight: "700",
  },
  cellTextRangeDark: {
    color: "#C084FC",
    fontWeight: "700",
  },
  badgeLabel: {
    position: "absolute",
    top: -2,
    right: -1,
    backgroundColor: "#3B0764",
    paddingHorizontal: 2.5,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 6.5,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 8,
  },
  dateSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  dateSummaryText: {
    fontSize: 10.5,
    fontWeight: "500",
    flex: 1,
    marginRight: 6,
  },
  clearDateText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#7C3AED",
  },
  budgetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
  },
  budgetAmountText: {
    fontSize: 11,
    fontWeight: "800",
  },
  rangeTrackContainer: {
    width: "100%",
    paddingVertical: 4,
  },
  rangeTrackBg: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    position: "relative",
    overflow: "hidden",
  },
  rangeTrackFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#7C3AED",
    borderRadius: 3,
  },
  budgetSteppersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 1,
  },
  stepperSubGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepperSubLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94A3B8",
  },
  stepperBtn: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsScrollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 3,
  },
  chipButton: {
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 9.5,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  guestRowBorderTop: {
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 2,
  },
  guestLabelCol: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  guestTitle: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  guestSubtitle: {
    fontSize: 10,
    fontWeight: "500",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  counterBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    width: 16,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
  },
  footerActionBox: {
    paddingTop: 4,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#581C87",
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: "#581C87",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});

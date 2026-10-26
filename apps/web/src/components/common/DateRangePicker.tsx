import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from "lucide-react";

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (formattedText: string) => void;
  position?: "top" | "bottom";
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
  initialFlexDays?: number | null;
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

const WEEKDAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  isOpen,
  onClose,
  onApply,
  position = "bottom",
  initialStartDate = null,
  initialEndDate = null,
  initialFlexDays = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Current viewed month & year in calendar
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState<Date>(() => {
    return initialStartDate ? new Date(initialStartDate) : new Date(today);
  });

  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [flexDays, setFlexDays] = useState<number | null>(initialFlexDays);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Calendar days calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0
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
    if (dayDate.getTime() < today.getTime()) return; // Disallow past dates

    if (!startDate || (startDate && endDate)) {
      // First click: set start date, reset end date
      setStartDate(dayDate);
      setEndDate(null);
    } else if (startDate && !endDate) {
      // Second click:
      if (dayDate.getTime() < startDate.getTime()) {
        // Clicked date is earlier than start: make it new start date
        setStartDate(dayDate);
      } else if (isSameDay(dayDate, startDate)) {
        // Clicked same day: single day trip
        setEndDate(dayDate);
      } else {
        // Clicked date is after start: set end date
        setEndDate(dayDate);
      }
    }
  };

  // Calculate nights
  const nightsCount =
    startDate && endDate
      ? Math.round(
          Math.abs(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

  const handleApply = () => {
    if (!startDate) return;

    let text = "";
    if (startDate && endDate && !isSameDay(startDate, endDate)) {
      if (startDate.getMonth() === endDate.getMonth()) {
        text = `${startDate.getDate()}–${endDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]}`;
      } else {
        text = `${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]} – ${endDate.getDate()} ${MONTH_NAMES_GENITIVE[endDate.getMonth()]}`;
      }
    } else {
      text = `с ${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]}`;
    }

    if (flexDays) {
      if (flexDays === 1) text += " (±1 день)";
      else if (flexDays === 3) text += " (±3 дня)";
      else if (flexDays === 7) text += " (±7 дней)";
    }

    onApply(`Даты: ${text}`);
    onClose();
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setFlexDays(null);
  };

  return (
    <div
      ref={containerRef}
      className={`absolute z-50 w-[330px] sm:w-[360px] bg-surface dark:bg-[#1c182c] border border-surface-border dark:border-[#383152] rounded-2xl shadow-2xl p-4 text-content-primary select-none transition-all animate-fade-in ${
        position === "top"
          ? "bottom-full mb-2 left-0 sm:left-0"
          : "top-full mt-2 left-0 sm:left-0"
      }`}
      style={{
        boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header with Title & Close */}
      <div className="flex items-center justify-between pb-3 border-b border-surface-border dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-content-primary">
              Даты поездки
            </h4>
            <p className="text-[11px] text-content-muted">
              Выберите диапазон вылета и возвращения
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted flex items-center justify-center transition-colors"
          title="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Range Display Pills */}
      <div className="grid grid-cols-2 gap-2 my-3">
        <div
          className={`p-2 rounded-xl border text-left transition-colors ${
            startDate
              ? "bg-primary/5 border-primary/30"
              : "bg-surface-muted/50 border-surface-border"
          }`}
        >
          <span className="text-[10px] text-content-muted font-medium block uppercase tracking-wider">
            Вылет (от)
          </span>
          <span className="text-xs font-semibold text-content-primary truncate block mt-0.5">
            {startDate
              ? `${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]}`
              : "Выберите дату"}
          </span>
        </div>

        <div
          className={`p-2 rounded-xl border text-left transition-colors ${
            endDate
              ? "bg-primary/5 border-primary/30"
              : "bg-surface-muted/50 border-surface-border"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-content-muted font-medium block uppercase tracking-wider">
              Возврат (до)
            </span>
            {nightsCount !== null && (
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded-sm">
                {nightsCount} {nightsCount === 1 ? "ночь" : nightsCount < 5 ? "ночи" : "ночей"}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-content-primary truncate block mt-0.5">
            {endDate
              ? `${endDate.getDate()} ${MONTH_NAMES_GENITIVE[endDate.getMonth()]}`
              : startDate
              ? "В один конец"
              : "Выберите дату"}
          </span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-7 h-7 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted flex items-center justify-center transition-colors"
          title="Предыдущий месяц"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs sm:text-sm font-bold text-content-primary">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="w-7 h-7 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted flex items-center justify-center transition-colors"
          title="Следующий месяц"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((name, i) => (
          <span
            key={name}
            className={`text-[11px] font-semibold py-1 ${
              i >= 5 ? "text-amber-500/80" : "text-content-muted"
            }`}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center">
        {/* Previous month padding days */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => {
          const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
          return (
            <div
              key={`prev-${i}`}
              className="h-8 flex items-center justify-center text-[11px] text-content-muted/30 select-none"
            >
              {dayNum}
            </div>
          );
        })}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayDate = new Date(currentYear, currentMonth, dayNum);
          dayDate.setHours(0, 0, 0, 0);

          const isPast = dayDate.getTime() < today.getTime();
          const isStart = isSameDay(dayDate, startDate);
          const isEnd = isSameDay(dayDate, endDate);
          const inRange = isBetween(dayDate, startDate, endDate);
          const inHoverRange =
            startDate &&
            !endDate &&
            hoverDate &&
            isBetween(dayDate, startDate, hoverDate);
          const isToday = isSameDay(dayDate, today);

          let cellClass = "text-content-primary hover:bg-surface-muted";
          if (isPast) {
            cellClass = "text-content-muted/30 cursor-not-allowed pointer-events-none";
          } else if (isStart || isEnd) {
            cellClass =
              "bg-primary text-white font-bold shadow-xs scale-105 z-10 rounded-full";
          } else if (inRange || inHoverRange) {
            cellClass = "bg-primary/15 text-primary font-medium rounded-none";
          }

          return (
            <button
              key={dayNum}
              type="button"
              disabled={isPast}
              onClick={() => handleDateClick(dayDate)}
              onMouseEnter={() => {
                if (startDate && !endDate) {
                  setHoverDate(dayDate);
                }
              }}
              className={`h-8 w-full flex items-center justify-center text-xs transition-all relative ${cellClass} ${
                !isStart && !isEnd && !inRange ? "rounded-lg" : ""
              }`}
            >
              <span>{dayNum}</span>
              {isToday && !isStart && !isEnd && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Flexibility Options: +-1 день, +-3 дня, +- 7 дней */}
      <div className="mt-4 pt-3 border-t border-surface-border dark:border-white/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-content-secondary">
            Гибкость дат:
          </span>
          {flexDays !== null && (
            <span className="text-[10px] text-primary font-medium">
              ±{flexDays} {flexDays === 1 ? "день" : flexDays === 3 ? "дня" : "дней"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setFlexDays(null)}
            className={`py-1 px-1.5 rounded-lg text-xs font-medium transition-all ${
              flexDays === null
                ? "bg-primary text-white shadow-xs"
                : "bg-surface-muted hover:bg-surface-subtle text-content-secondary"
            }`}
          >
            Точные
          </button>
          <button
            type="button"
            onClick={() => setFlexDays(1)}
            className={`py-1 px-1.5 rounded-lg text-xs font-medium transition-all ${
              flexDays === 1
                ? "bg-primary text-white shadow-xs"
                : "bg-surface-muted hover:bg-surface-subtle text-content-secondary"
            }`}
          >
            ±1 день
          </button>
          <button
            type="button"
            onClick={() => setFlexDays(3)}
            className={`py-1 px-1.5 rounded-lg text-xs font-medium transition-all ${
              flexDays === 3
                ? "bg-primary text-white shadow-xs"
                : "bg-surface-muted hover:bg-surface-subtle text-content-secondary"
            }`}
          >
            ±3 дня
          </button>
          <button
            type="button"
            onClick={() => setFlexDays(7)}
            className={`py-1 px-1.5 rounded-lg text-xs font-medium transition-all ${
              flexDays === 7
                ? "bg-primary text-white shadow-xs"
                : "bg-surface-muted hover:bg-surface-subtle text-content-secondary"
            }`}
          >
            ±7 дней
          </button>
        </div>
      </div>

      {/* Actions: Reset & Apply */}
      <div className="mt-4 pt-3 border-t border-surface-border dark:border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-content-muted hover:text-content-primary transition-colors px-1"
        >
          Сбросить
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!startDate}
            onClick={handleApply}
            className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X, Check } from "lucide-react";

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
      setStartDate(dayDate);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (dayDate.getTime() < startDate.getTime()) {
        setStartDate(dayDate);
      } else if (isSameDay(dayDate, startDate)) {
        setEndDate(dayDate);
      } else {
        setEndDate(dayDate);
      }
    }
  };

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
      className={`absolute z-50 w-[285px] sm:w-[305px] bg-surface dark:bg-[#1c182c] border border-surface-border dark:border-[#383152] rounded-2xl shadow-2xl p-3 text-content-primary select-none transition-all animate-fade-in ${
        position === "top"
          ? "bottom-full mb-2 left-0 sm:left-0"
          : "top-full mt-2 left-0 sm:left-0"
      }`}
      style={{
        boxShadow: "0 16px 36px -8px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      {/* Month Navigation & Close */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-6 h-6 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted flex items-center justify-center transition-colors"
            title="Предыдущий месяц"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs sm:text-sm font-bold text-content-primary px-1">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-6 h-6 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted flex items-center justify-center transition-colors"
            title="Следующий месяц"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted flex items-center justify-center transition-colors"
          title="Закрыть"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Calendar Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((name, i) => (
          <span
            key={name}
            className={`text-[10px] font-semibold py-0.5 ${
              i >= 5 ? "text-amber-500/80" : "text-content-muted"
            }`}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-y-0.5 gap-x-0.5 text-center">
        {/* Previous month padding days */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => {
          const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
          return (
            <div
              key={`prev-${i}`}
              className="h-7 flex items-center justify-center text-[10px] text-content-muted/25 select-none"
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
            cellClass = "text-content-muted/25 cursor-not-allowed pointer-events-none";
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
              className={`h-7 w-full flex items-center justify-center text-xs transition-all relative ${cellClass} ${
                !isStart && !isEnd && !inRange ? "rounded-md" : ""
              }`}
            >
              <span>{dayNum}</span>
              {isToday && !isStart && !isEnd && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Flexibility Options: +-1 день, +-3 дня, +- 7 дней (Compact without extra header) */}
      <div className="mt-2.5 pt-2 border-t border-surface-border dark:border-white/10">
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setFlexDays(null)}
            className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-all ${
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
            className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-all ${
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
            className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-all ${
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
            className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-all ${
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
      <div className="mt-2.5 pt-2 border-t border-surface-border dark:border-white/10 flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="text-[11px] text-content-muted hover:text-content-primary transition-colors px-1"
        >
          Сбросить
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-content-muted hover:text-content-primary hover:bg-surface-muted transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!startDate}
            onClick={handleApply}
            className="px-3 py-1 rounded-lg bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-semibold shadow-xs flex items-center gap-1 transition-all active:scale-95"
          >
            <Check className="w-3 h-3" />
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>
  );
};

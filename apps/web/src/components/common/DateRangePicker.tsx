import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Check, GripHorizontal } from "lucide-react";

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (formattedText: string) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
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
  anchorRef,
  initialStartDate = null,
  initialEndDate = null,
  initialFlexDays = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Position state for draggable window in screen viewport coordinates
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState<Date>(() => {
    return initialStartDate ? new Date(initialStartDate) : new Date(today);
  });

  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [flexDays, setFlexDays] = useState<number | null>(initialFlexDays);

  // Calculate default position: to the left of the input container (anchorRef)
  useEffect(() => {
    if (!isOpen) {
      setPos(null);
      return;
    }

    const calendarWidth = 310;
    const calendarHeight = 350;

    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      // Default position: to the left of the input box with a 16px gap
      let x = rect.left - calendarWidth - 16;
      let y = rect.top;

      // If not enough room to the left of the input box, place at left margin of the screen
      if (x < 16) {
        x = 16;
      }

      // Check vertical viewport bounds
      if (y + calendarHeight > window.innerHeight - 16) {
        y = Math.max(16, window.innerHeight - calendarHeight - 16);
      }
      if (y < 16) {
        y = 16;
      }

      setPos({ x, y });
    } else {
      setPos({ x: 16, y: 100 });
    }
  }, [isOpen, anchorRef]);

  // Close on Escape or click outside (unless currently dragging)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (isDraggingRef.current) return;
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

  // Dragging logic by top frame / handle
  const handleDragStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;

    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pos?.x ?? 16,
      initY: pos?.y ?? 100,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const calendarWidth = 310;
      const calendarHeight = 350;

      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      const nextX = dragStartRef.current.initX + deltaX;
      const nextY = dragStartRef.current.initY + deltaY;

      // Allow dragging all the way to 8px from screen edges
      const clampedX = Math.max(8, Math.min(window.innerWidth - calendarWidth - 8, nextX));
      const clampedY = Math.max(8, Math.min(window.innerHeight - calendarHeight - 8, nextY));

      setPos({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 50);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  if (!isOpen) return null;

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

  // Click 1: sets "от"
  // Click 2: sets "до"
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

  return createPortal(
    <div
      ref={containerRef}
      className="fixed z-[100] w-[300px] sm:w-[315px] bg-surface dark:bg-[#1c182c] border border-surface-border dark:border-[#383152] rounded-2xl shadow-2xl p-3 text-content-primary select-none cursor-default"
      style={{
        left: pos ? `${pos.x}px` : "16px",
        top: pos ? `${pos.y}px` : "100px",
        boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0,0,0,0.1)",
      }}
    >
      {/* Draggable Top Frame Bar */}
      <div
        onPointerDown={handleDragStart}
        className="w-full flex items-center justify-between pb-1.5 mb-1.5 border-b border-surface-border/60 dark:border-white/10 cursor-grab active:cursor-grabbing group select-none"
        title="Зажмите и перетащите в любое место"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-content-muted group-hover:text-primary transition-colors">
          <GripHorizontal className="w-3.5 h-3.5" />
          <span>Перетащить</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-5 h-5 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted flex items-center justify-center transition-colors"
          title="Закрыть"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="w-6 h-6 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted flex items-center justify-center transition-colors"
          title="Предыдущий месяц"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="text-xs sm:text-sm font-bold text-content-primary">
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

      {/* Trip Range "от" / "до" Status Indicator Strip */}
      {startDate && !endDate && (
        <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium mb-1.5">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span>
              Вылет (от): <strong>{startDate.getDate()} {MONTH_NAMES_GENITIVE[startDate.getMonth()]}</strong>
            </span>
          </span>
          <span className="text-content-muted text-[10px] shrink-0 ml-1">кликните дату «до»</span>
        </div>
      )}

      {startDate && endDate && (
        <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-lg bg-primary/15 border border-primary/25 text-primary font-medium mb-1.5">
          <span className="truncate">
            <strong>{startDate.getDate()} {MONTH_NAMES_GENITIVE[startDate.getMonth()]}</strong> (от)
            {" → "}
            <strong>{endDate.getDate()} {MONTH_NAMES_GENITIVE[endDate.getMonth()]}</strong> (до)
          </span>
          {nightsCount !== null && (
            <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.2 rounded-sm ml-1 shrink-0">
              {nightsCount} {nightsCount === 1 ? "ночь" : nightsCount < 5 ? "ночи" : "ночей"}
            </span>
          )}
        </div>
      )}

      {!startDate && (
        <div className="text-[10px] text-content-muted px-1 mb-1.5 text-center">
          Кликните день вылета (от) и возвращения (до)
        </div>
      )}

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
      <div className="grid grid-cols-7 gap-y-0.5 gap-x-0 text-center">
        {/* Previous month padding days */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => {
          const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
          return (
            <div
              key={`prev-${i}`}
              className="h-8 flex items-center justify-center text-[10px] text-content-muted/25 select-none"
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

          let bgWrapper = "";
          let buttonStyle = "text-content-primary hover:bg-surface-muted rounded-lg";
          let badgeLabel: string | null = null;

          if (isPast) {
            buttonStyle = "text-content-muted/25 cursor-not-allowed pointer-events-none";
          } else if (isStart && isEnd) {
            buttonStyle = "bg-primary text-white font-bold shadow-sm rounded-lg scale-100 z-10";
            badgeLabel = "1 дн";
          } else if (isStart) {
            bgWrapper = endDate ? "bg-primary/20 dark:bg-primary/30 rounded-l-lg" : "";
            buttonStyle = "bg-primary text-white font-bold shadow-sm rounded-lg scale-100 z-10";
            badgeLabel = "от";
          } else if (isEnd) {
            bgWrapper = "bg-primary/20 dark:bg-primary/30 rounded-r-lg";
            buttonStyle = "bg-primary text-white font-bold shadow-sm rounded-lg scale-100 z-10";
            badgeLabel = "до";
          } else if (inRange || inHoverRange) {
            bgWrapper = "bg-primary/20 dark:bg-primary/30";
            buttonStyle = "text-primary font-bold rounded-none hover:bg-primary/30";
          }

          return (
            <div key={dayNum} className={`h-8 w-full flex items-center justify-center p-0.5 relative ${bgWrapper}`}>
              <button
                type="button"
                disabled={isPast}
                onClick={() => handleDateClick(dayDate)}
                onMouseEnter={() => {
                  if (startDate && !endDate) {
                    setHoverDate(dayDate);
                  }
                }}
                className={`h-full w-full flex flex-col items-center justify-center text-xs transition-all relative ${buttonStyle}`}
              >
                <span className="leading-none text-[11px] font-semibold">{dayNum}</span>
                {badgeLabel && (
                  <span className="text-[7.5px] font-extrabold uppercase tracking-tight text-white/95 leading-none mt-0.5">
                    {badgeLabel}
                  </span>
                )}
                {isToday && !isStart && !isEnd && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Flexibility Options: +-1 день, +-3 дня, +- 7 дней */}
      <div className="mt-2.5 pt-2 border-t border-surface-border dark:border-white/10">
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setFlexDays(null)}
            className={`py-1 px-1 rounded-lg text-[11px] font-medium transition-all ${
              flexDays === null
                ? "bg-primary text-white shadow-xs font-semibold"
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
                ? "bg-primary text-white shadow-xs font-semibold"
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
                ? "bg-primary text-white shadow-xs font-semibold"
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
                ? "bg-primary text-white shadow-xs font-semibold"
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
    </div>,
    document.body
  );
};

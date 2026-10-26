import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";

export interface SearchFilters {
  startDate: Date | null;
  endDate: Date | null;
  minBudget: number;
  maxBudget: number;
  adults: number;
  children: number;
}

interface SearchFiltersPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (formattedText: string, filters: SearchFilters) => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  initialFilters?: Partial<SearchFilters>;
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
const MAX_POSSIBLE_BUDGET = 500000;
const BUDGET_STEP = 5000;

function formatRubles(amount: number): string {
  return amount.toLocaleString("ru-RU") + " ₽";
}

export const SearchFiltersPopover: React.FC<SearchFiltersPopoverProps> = ({
  isOpen,
  onClose,
  onApply,
  anchorRef,
  initialFilters,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Custom position if dragged by user
  const [draggedPos, setDraggedPos] = useState<{ x: number; y: number } | null>(null);

  // Synchronous position calculation relative to anchorRef
  const calculateDefaultPosition = () => {
    const panelWidth = 330;
    const panelHeight = 540;

    if (anchorRef?.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      let x = rect.left - panelWidth - 16;
      let y = rect.top;

      if (x < 16) {
        x = 16;
      }
      if (y + panelHeight > window.innerHeight - 16) {
        y = Math.max(16, window.innerHeight - panelHeight - 16);
      }
      if (y < 16) {
        y = 16;
      }
      return { x, y };
    }
    return { x: 16, y: 80 };
  };

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Dates state
  const [viewDate, setViewDate] = useState<Date>(() => {
    return initialFilters?.startDate ? new Date(initialFilters.startDate) : new Date(today);
  });
  const [startDate, setStartDate] = useState<Date | null>(initialFilters?.startDate ?? null);
  const [endDate, setEndDate] = useState<Date | null>(initialFilters?.endDate ?? null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Budget state
  const [minBudget, setMinBudget] = useState<number>(initialFilters?.minBudget ?? 40000);
  const [maxBudget, setMaxBudget] = useState<number>(initialFilters?.maxBudget ?? 180000);

  // Guests state
  const [adults, setAdults] = useState<number>(initialFilters?.adults ?? 2);
  const [children, setChildren] = useState<number>(initialFilters?.children ?? 0);

  // Reset dragged position when closed
  useEffect(() => {
    if (!isOpen) {
      setDraggedPos(null);
    }
  }, [isOpen]);

  // Window resize/scroll listener to update position when not manually dragged
  const [, setRepositionTick] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const handleReposition = () => {
      if (!isDraggingRef.current && !draggedPos) {
        setRepositionTick((t) => t + 1);
      }
    };
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, draggedPos]);

  // Close on Escape or click outside
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

  // Dragging logic by header
  const handleDragStart = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input")) return;

    const current = draggedPos ?? calculateDefaultPosition();
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: current.x,
      initY: current.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const panelWidth = 330;
      const panelHeight = 540;

      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      const nextX = dragStartRef.current.initX + deltaX;
      const nextY = dragStartRef.current.initY + deltaY;

      const clampedX = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, nextX));
      const clampedY = Math.max(8, Math.min(window.innerHeight - panelHeight - 8, nextY));

      setDraggedPos({ x: clampedX, y: clampedY });
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

  const currentPos = draggedPos ?? calculateDefaultPosition();

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

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setMinBudget(40000);
    setMaxBudget(180000);
    setAdults(2);
    setChildren(0);
  };

  const handleApply = () => {
    const parts: string[] = [];

    // Dates
    if (startDate && endDate && !isSameDay(startDate, endDate)) {
      const datesText =
        startDate.getMonth() === endDate.getMonth()
          ? `${startDate.getDate()}–${endDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]}`
          : `${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]} – ${endDate.getDate()} ${MONTH_NAMES_GENITIVE[endDate.getMonth()]}`;
      parts.push(`+ Даты: ${datesText}`);
    } else if (startDate) {
      parts.push(`+ Даты: с ${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]}`);
    }

    // Budget
    if (minBudget > MIN_POSSIBLE_BUDGET || maxBudget < MAX_POSSIBLE_BUDGET) {
      if (minBudget > MIN_POSSIBLE_BUDGET && maxBudget < MAX_POSSIBLE_BUDGET) {
        parts.push(`+ Бюджет: ${formatRubles(minBudget)} – ${formatRubles(maxBudget)}`);
      } else if (maxBudget < MAX_POSSIBLE_BUDGET) {
        parts.push(`+ Бюджет: до ${formatRubles(maxBudget)}`);
      } else {
        parts.push(`+ Бюджет: от ${formatRubles(minBudget)}`);
      }
    }

    // Guests
    const guestParts: string[] = [];
    if (adults > 0) {
      guestParts.push(`${adults} ${adults === 1 ? "взрослый" : adults < 5 ? "взрослых" : "взрослых"}`);
    }
    if (children > 0) {
      guestParts.push(`${children} ${children === 1 ? "ребёнок" : children < 5 ? "ребёнка" : "детей"}`);
    }
    if (guestParts.length > 0) {
      parts.push(`+ ${guestParts.join(", ")}`);
    }

    const formattedText = parts.join(" ");
    onApply(formattedText, {
      startDate,
      endDate,
      minBudget,
      maxBudget,
      adults,
      children,
    });
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

  const remaining = 35 - calendarCells.length;
  if (remaining > 0) {
    for (let d = 1; d <= remaining; d++) {
      calendarCells.push({ day: d, isCurrentMonth: false, isPast: false, date: null });
    }
  }

  return createPortal(
    <div
      ref={containerRef}
      onPointerDown={handleDragStart}
      className="fixed z-[100] w-[320px] sm:w-[335px] max-h-[calc(100vh-32px)] overflow-y-auto no-scrollbar bg-surface dark:bg-[#1c182c] border border-surface-border dark:border-[#383152] rounded-2xl shadow-2xl p-3 text-content-primary select-none cursor-default flex flex-col gap-3 animate-fade-in"
      style={{
        left: `${currentPos.x}px`,
        top: `${currentPos.y}px`,
        boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(0,0,0,0.1)",
      }}
    >
      {/* 1. Header (Drag handle) */}
      <div className="flex items-center justify-between px-1 cursor-grab active:cursor-grabbing border-b border-surface-border dark:border-[#2d2744] pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-content-primary">
            Параметры поездки
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-md text-content-muted hover:text-content-primary hover:bg-surface-muted dark:hover:bg-[#2b2542] flex items-center justify-center transition-colors cursor-pointer"
          title="Закрыть"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Top: Mini-Calendar */}
      <div className="flex flex-col gap-1.5 bg-surface-muted/50 dark:bg-[#231e38] p-2 rounded-xl border border-surface-border/50 dark:border-[#322a4d]">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-content-primary flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
            <span>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </span>
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-5 h-5 rounded text-content-muted hover:text-content-primary hover:bg-surface dark:hover:bg-[#302a4d] flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-5 h-5 rounded text-content-muted hover:text-content-primary hover:bg-surface dark:hover:bg-[#302a4d] flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-content-muted">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="py-0.5">
              {wd}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-y-0.5 text-center text-[11px]">
          {calendarCells.map((cell, idx) => {
            if (!cell.isCurrentMonth || !cell.date) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="h-6 flex items-center justify-center text-content-muted/30"
                >
                  {cell.day}
                </div>
              );
            }

            const dayDate = cell.date;
            const isStart = isSameDay(dayDate, startDate);
            const isEnd = isSameDay(dayDate, endDate);
            const inRange =
              isBetween(dayDate, startDate, endDate) ||
              (startDate && !endDate && hoverDate && isBetween(dayDate, startDate, hoverDate));
            const isToday = isSameDay(dayDate, today);

            return (
              <button
                key={`day-${cell.day}`}
                type="button"
                disabled={cell.isPast}
                onClick={() => handleDateClick(dayDate)}
                onMouseEnter={() => !endDate && setHoverDate(dayDate)}
                onMouseLeave={() => setHoverDate(null)}
                className={`relative h-6 w-full flex items-center justify-center rounded transition-colors text-[11px] font-medium ${
                  cell.isPast
                    ? "text-content-muted/30 cursor-not-allowed"
                    : isStart || isEnd
                    ? "bg-primary text-white font-bold shadow-xs z-10"
                    : inRange
                    ? "bg-primary/15 dark:bg-primary/25 text-primary dark:text-purple-300 rounded-none font-semibold"
                    : "text-content-primary hover:bg-surface-muted dark:hover:bg-[#2f2748] cursor-pointer"
                } ${isToday && !isStart && !isEnd ? "ring-1 ring-primary/40 rounded" : ""}`}
              >
                <span>{cell.day}</span>
                {isStart && (
                  <span className="absolute -top-1 -right-0.5 text-[8px] leading-none bg-purple-900 text-white px-0.5 rounded font-bold">
                    от
                  </span>
                )}
                {isEnd && (
                  <span className="absolute -top-1 -right-0.5 text-[8px] leading-none bg-purple-900 text-white px-0.5 rounded font-bold">
                    до
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Date summary row */}
        <div className="text-[10px] text-content-secondary px-0.5 flex items-center justify-between pt-0.5">
          <span>
            {startDate && endDate
              ? `${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]} — ${endDate.getDate()} ${MONTH_NAMES_GENITIVE[endDate.getMonth()]}`
              : startDate
              ? `с ${startDate.getDate()} ${MONTH_NAMES_GENITIVE[startDate.getMonth()]} (выберите дату «до»)`
              : "Даты не выбраны"}
          </span>
          {startDate && (
            <button
              type="button"
              onClick={() => {
                setStartDate(null);
                setEndDate(null);
              }}
              className="text-primary hover:underline text-[10px] font-medium"
            >
              Очистить
            </button>
          )}
        </div>
      </div>

      {/* 3. Middle: Budget (Range Slider) */}
      <div className="flex flex-col gap-2 bg-surface-muted/50 dark:bg-[#231e38] p-2.5 rounded-xl border border-surface-border/50 dark:border-[#322a4d]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-content-primary flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            <span>Бюджет поездки</span>
          </span>
          <span className="text-xs font-semibold text-primary dark:text-purple-300">
            {formatRubles(minBudget)} — {formatRubles(maxBudget)}
          </span>
        </div>

        {/* Dual range slider */}
        <div className="relative w-full h-5 flex items-center px-1">
          {/* Background Track */}
          <div className="absolute left-1 right-1 h-1.5 bg-surface-border dark:bg-[#342b52] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{
                marginLeft: `${((minBudget - MIN_POSSIBLE_BUDGET) / (MAX_POSSIBLE_BUDGET - MIN_POSSIBLE_BUDGET)) * 100}%`,
                width: `${((maxBudget - minBudget) / (MAX_POSSIBLE_BUDGET - MIN_POSSIBLE_BUDGET)) * 100}%`,
              }}
            />
          </div>

          {/* Min thumb input */}
          <input
            type="range"
            min={MIN_POSSIBLE_BUDGET}
            max={MAX_POSSIBLE_BUDGET}
            step={BUDGET_STEP}
            value={minBudget}
            onChange={(e) => {
              const val = Math.min(Number(e.target.value), maxBudget - BUDGET_STEP);
              setMinBudget(val);
            }}
            className="absolute left-1 right-1 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white dark:[&::-webkit-slider-thumb]:border-[#1c182c] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
          />

          {/* Max thumb input */}
          <input
            type="range"
            min={MIN_POSSIBLE_BUDGET}
            max={MAX_POSSIBLE_BUDGET}
            step={BUDGET_STEP}
            value={maxBudget}
            onChange={(e) => {
              const val = Math.max(Number(e.target.value), minBudget + BUDGET_STEP);
              setMaxBudget(val);
            }}
            className="absolute left-1 right-1 appearance-none bg-transparent pointer-events-none cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white dark:[&::-webkit-slider-thumb]:border-[#1c182c] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
          />
        </div>

        {/* Quick budget chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
          {[
            { label: "до 100 тыс.", min: 20000, max: 100000 },
            { label: "до 150 тыс.", min: 40000, max: 150000 },
            { label: "до 250 тыс.", min: 60000, max: 250000 },
            { label: "до 400 тыс.", min: 100000, max: 400000 },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setMinBudget(chip.min);
                setMaxBudget(chip.max);
              }}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface dark:bg-[#2b2542] hover:bg-surface-border text-content-secondary hover:text-content-primary shrink-0 transition-colors border border-surface-border/50 dark:border-transparent"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Bottom: Adults and Children Counters */}
      <div className="flex flex-col gap-2 bg-surface-muted/50 dark:bg-[#231e38] p-2.5 rounded-xl border border-surface-border/50 dark:border-[#322a4d]">
        <span className="text-xs font-bold text-content-primary flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>Количество гостей</span>
        </span>

        {/* Adults row */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <div>
            <div className="font-medium text-content-primary">Взрослые</div>
            <div className="text-[10px] text-content-muted">от 12 лет</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={adults <= 1}
              onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
              className="w-6 h-6 rounded-md bg-surface dark:bg-[#2e2747] border border-surface-border dark:border-[#3d345a] flex items-center justify-center text-content-primary hover:bg-surface-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-5 text-center font-bold text-sm text-content-primary">{adults}</span>
            <button
              type="button"
              disabled={adults >= 8}
              onClick={() => setAdults((prev) => Math.min(8, prev + 1))}
              className="w-6 h-6 rounded-md bg-surface dark:bg-[#2e2747] border border-surface-border dark:border-[#3d345a] flex items-center justify-center text-content-primary hover:bg-surface-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Children row */}
        <div className="flex items-center justify-between text-xs py-0.5 border-t border-surface-border/50 dark:border-[#2d2744] pt-1.5">
          <div>
            <div className="font-medium text-content-primary">Дети</div>
            <div className="text-[10px] text-content-muted">до 11 лет</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={children <= 0}
              onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
              className="w-6 h-6 rounded-md bg-surface dark:bg-[#2e2747] border border-surface-border dark:border-[#3d345a] flex items-center justify-center text-content-primary hover:bg-surface-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-5 text-center font-bold text-sm text-content-primary">{children}</span>
            <button
              type="button"
              disabled={children >= 6}
              onClick={() => setChildren((prev) => Math.min(6, prev + 1))}
              className="w-6 h-6 rounded-md bg-surface dark:bg-[#2e2747] border border-surface-border dark:border-[#3d345a] flex items-center justify-center text-content-primary hover:bg-surface-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Footer actions */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-border dark:border-[#2d2744]">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-[11px] text-content-muted hover:text-content-primary transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Сбросить</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-muted dark:hover:bg-[#28223c] transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-3.5 py-1 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Применить</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

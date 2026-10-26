import React from "react";
import { Route, Calendar, Plane, Car, Hotel, ArrowRight } from "lucide-react";
import { ActivityItem } from "./ActivityItem";
import { TripOption } from "../../types/travel";
import { formatDateRange } from "@corvax/shared";

interface DayTimelineProps {
  option?: TripOption | null;
  dateRangeText?: string;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  option,
  dateRangeText,
}) => {
  const primaryFlight = option?.flights?.[0];
  const returnFlight = option?.flights?.[1];
  const primaryHotel = option?.hotels?.[0];
  const destination = option?.destination || "Курорт";

  const effectiveDateRange =
    dateRangeText ||
    (primaryHotel?.check_in && primaryHotel?.check_out
      ? formatDateRange(primaryHotel.check_in, primaryHotel.check_out)
      : "12 — 19 ноября (7 ночей)");

  return (
    <div className="flex flex-col gap-3 p-4 bg-surface-container-low rounded-xl border border-surface-container-highest/60 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest/60">
        <span className="text-xs sm:text-sm font-bold text-content-primary flex items-center gap-2">
          <Route className="w-4 h-4 text-primary" />
          <span>План путешествия по этапам</span>
        </span>
        <span className="text-xs font-mono text-content-muted flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{effectiveDateRange}</span>
        </span>
      </div>

      {/* 4 unified chronological segments */}
      <div className="pt-2">
        {/* Segment 1: Outbound Transport */}
        <ActivityItem
          index={1}
          title={`Вылет: ${primaryFlight?.origin || "Москва (SVO)"} → ${primaryFlight?.destination || "Дубай (DXB)"}`}
          subtitle={primaryFlight?.carrier || "Прямой рейс"}
          timeLabel="День 1 • 08:45"
          description={`Прямой дневной рейс ${primaryFlight?.carrier || "авиакомпании"} ${primaryFlight?.flight_number || "FZ-968"}. Прибытие без ночной усталости, включён багаж 20 кг.`}
          icon={Plane}
          variant="primary"
        />

        {/* Segment 2: Transfer & Check-in */}
        <ActivityItem
          index={2}
          title="Встреча в аэропорту и трансфер"
          timeLabel="День 1 • 15:30"
          description="Индивидуальная встреча с табличкой в зале прилёта, комфортабельный минивэн с детским автокреслом. Поездка в отель (~45–50 мин)."
          icon={Car}
          variant="tertiary"
        />

        {/* Segment 3: Stay & Resort */}
        <ActivityItem
          index={3}
          title={`Отдых: ${primaryHotel?.hotel || destination}`}
          timeLabel="7 ночей"
          description={`Проживание в ${primaryHotel?.hotel || "курортном отеле"}: первая береговая линия, пологий песчаный вход в море, питание и детская анимация.`}
          icon={Hotel}
          variant="secondary"
        />

        {/* Segment 4: Return Flight */}
        <ActivityItem
          index={4}
          title={`Обратный выезд и перелёт: ${returnFlight?.origin || "Дубай"} → ${returnFlight?.destination || "Москва"}`}
          timeLabel="День 8 • 16:30"
          description="Трансфер из отеля в аэропорт за 3 часа до вылета. Дневной перелёт домой, прибытие в Москву вечером."
          icon={Plane}
          variant="primary"
          isLast
        />
      </div>
    </div>
  );
};

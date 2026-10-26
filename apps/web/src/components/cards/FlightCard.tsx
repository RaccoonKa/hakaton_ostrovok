import React from "react";
import { Plane, ArrowRight, Luggage, CheckCircle2 } from "lucide-react";
import { Flight } from "../../types/travel";
import { formatDuration } from "@corvax/shared";

interface FlightCardProps {
  flight: Flight;
  returnFlight?: Flight;
  isIncluded?: boolean;
}

export const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  returnFlight,
  isIncluded = true,
}) => {
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="p-4 bg-surface-container-low rounded-xl flex flex-col gap-3 border border-surface-container-highest/60 shadow-sm transition-all">
      {/* Flight header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-xs shrink-0">
            <Plane className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-content-primary flex items-center gap-2">
              <span>{flight.carrier || "Регулярный рейс"}</span>
              {flight.flight_number && (
                <span className="text-xs font-mono font-normal text-content-muted">
                  ({flight.flight_number})
                </span>
              )}
            </div>
            <span className="block text-xs text-content-muted mt-0.5">
              {flight.stops === 0 ? "Прямой дневной перелёт" : `${flight.stops} пересадка`} •{" "}
              {flight.baggage || "Багаж 20 кг включён"}
            </span>
          </div>
        </div>

        {isIncluded && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            <span>Включено в тур</span>
          </span>
        )}
      </div>

      {/* Outbound leg */}
      <div className="pt-2 border-t border-surface-container-highest/60 flex flex-wrap items-center justify-between gap-2 text-content-primary">
        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          <span className="font-semibold">{formatTime(flight.departure_at)}</span>
          <span className="text-content-secondary">{flight.origin}</span>
          <ArrowRight className="w-3.5 h-3.5 text-content-muted" />
          <span className="font-semibold">{formatTime(flight.arrival_at)}</span>
          <span className="text-content-secondary">{flight.destination}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-content-muted">
          {flight.duration && <span>{formatDuration(flight.duration)} в пути</span>}
          {flight.baggage && (
            <span className="inline-flex items-center gap-1">
              <Luggage className="w-3 h-3" />
              <span>{flight.baggage}</span>
            </span>
          )}
        </div>
      </div>

      {/* Return leg if provided */}
      {returnFlight && (
        <div className="pt-2 border-t border-surface-container-highest/40 flex flex-wrap items-center justify-between gap-2 text-content-primary">
          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            <span className="font-semibold">{formatTime(returnFlight.departure_at)}</span>
            <span className="text-content-secondary">{returnFlight.origin}</span>
            <ArrowRight className="w-3.5 h-3.5 text-content-muted" />
            <span className="font-semibold">{formatTime(returnFlight.arrival_at)}</span>
            <span className="text-content-secondary">{returnFlight.destination}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-content-muted">
            {returnFlight.duration && (
              <span>{formatDuration(returnFlight.duration)} в пути (обратно)</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

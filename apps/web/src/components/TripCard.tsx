import React from "react";
import { Plane, Building, Calendar, Star, CheckCircle2, ArrowRight } from "lucide-react";
import { TripOption } from "@corvax/shared";
import { formatPrice, formatDateRange, formatNights } from "@corvax/shared";
import { DemoBadge } from "./DemoBadge";

interface TripCardProps {
  option: TripOption;
  onSelect?: (option: TripOption) => void;
  selected?: boolean;
}

export const TripCard: React.FC<TripCardProps> = ({ option, onSelect, selected }) => {
  const primaryHotel = option.hotels?.[0];
  const primaryFlight = option.flights?.[0];

  return (
    <div
      className={`bg-surface rounded-2xl border transition-all duration-200 overflow-hidden shadow-card hover:shadow-card-hover ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-surface-border"
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {option.destination || "Направление"}
              </span>
              {option.isDemo && <DemoBadge />}
            </div>
            <h3 className="text-lg font-bold text-content-primary leading-snug">
              {option.title || "Вариант путешествия"}
            </h3>
          </div>
          {option.score && (
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{(option.score / 20).toFixed(1)}</span>
            </div>
          )}
        </div>

        {option.description && (
          <p className="text-sm text-content-secondary mb-4 line-clamp-2">
            {option.description}
          </p>
        )}

        <div className="space-y-2.5 py-3 border-t border-b border-surface-border my-3 text-sm text-content-secondary">
          {primaryFlight && (
            <div className="flex items-center gap-2.5">
              <Plane className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">
                {primaryFlight.origin} → {primaryFlight.destination}
                {primaryFlight.carrier && ` (${primaryFlight.carrier})`}
              </span>
            </div>
          )}

          {primaryHotel && (
            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="truncate">
                {primaryHotel.hotel}
                {primaryHotel.meal_plan && ` • ${primaryHotel.meal_plan}`}
              </span>
            </div>
          )}

          {primaryHotel?.check_in && (
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                {formatDateRange(primaryHotel.check_in, primaryHotel.check_out)}
                {option.stops?.[0]?.nights && ` (${formatNights(option.stops[0].nights)})`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <div className="text-xs text-content-muted">Итоговая стоимость</div>
            <div className="text-xl font-bold text-content-primary">
              {formatPrice(option.total_price, option.currency)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect?.(option)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
              selected
                ? "bg-primary text-white"
                : "bg-surface-muted hover:bg-surface-subtle text-content-primary"
            }`}
          >
            {selected ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Выбрано</span>
              </>
            ) : (
              <>
                <span>Выбрать тур</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

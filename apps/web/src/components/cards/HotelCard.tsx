import React from "react";
import {
  Building2,
  MapPin,
  Bed,
  Utensils,
  Waves,
  Star,
  Check,
  ArrowRightLeft,
} from "lucide-react";
import { Hotel } from "../../types/travel";
import { formatMealPlan } from "@corvax/shared";

interface HotelCardProps {
  hotel: Hotel;
  onCompare?: () => void;
  onSelectRoom?: () => void;
  isMainChoice?: boolean;
}

export const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  onCompare,
  onSelectRoom,
  isMainChoice = true,
}) => {
  // Sample travel image fallback matching Stitch references
  const imageUrl =
    hotel.image_url ||
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80";

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-surface-container-low rounded-xl border border-surface-container-highest/60 shadow-sm transition-all">
      {/* Hotel photo */}
      <div className="md:w-56 h-40 shrink-0 rounded-lg overflow-hidden relative shadow-xs bg-surface-container-highest">
        <img
          src={imageUrl}
          alt={hotel.hotel}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {hotel.rating && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-xs text-xs font-semibold text-content-primary flex items-center gap-1 shadow-xs">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            <span>{hotel.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isMainChoice && (
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest text-primary text-xs font-medium border border-surface-container-highest/60">
                    Основной выбор
                  </span>
                )}
                {hotel.rating && (
                  <span className="text-xs text-content-muted">
                    Оценка гостей {hotel.rating >= 4 ? "8.7 / Отлично" : `${hotel.rating} / Хорошо`}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-content-primary leading-snug">
                {hotel.hotel}
              </h3>
              <p className="text-xs text-content-muted flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-content-muted shrink-0" />
                <span>
                  {hotel.city} • Первая береговая линия
                </span>
              </p>
            </div>
          </div>

          {/* Key characteristics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-surface-container-highest/60 text-xs text-content-primary">
            <div className="flex items-center gap-1.5">
              <Bed className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{hotel.room_type || "Стандартный номер"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">
                {hotel.meal_plan ? formatMealPlan(hotel.meal_plan) : "Завтрак включён"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Waves className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Песчаный пологий вход</span>
            </div>
          </div>

          {/* Cancellation note */}
          {hotel.cancellation_conditions && (
            <p className="text-[11px] text-content-muted mt-2 flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-600" />
              <span>{hotel.cancellation_conditions}</span>
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-surface-container-highest/60">
          <span className="text-xs text-content-muted">
            Проживание входит в итоговую стоимость
          </span>
          <div className="flex items-center gap-2">
            {onCompare && (
              <button
                type="button"
                onClick={onCompare}
                className="px-2.5 py-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-container-high text-xs transition-colors flex items-center gap-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Сравнить</span>
              </button>
            )}
            <button
              type="button"
              onClick={onSelectRoom}
              className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high border border-surface-container-highest text-content-primary text-xs font-medium transition-colors shadow-xs"
            >
              Выбрать номер
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

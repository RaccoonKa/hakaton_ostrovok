import React from "react";
import { Plane, Star, Clock, CheckCircle2, ArrowRight, Train } from "lucide-react";
import { TripOption } from "../../types/travel";
import { formatPrice } from "@corvax/shared";

interface TripOptionCardProps {
  option: TripOption;
  selected?: boolean;
  onSelect?: (option: TripOption) => void;
}

export const TripOptionCard: React.FC<TripOptionCardProps> = ({
  option,
  selected = false,
  onSelect,
}) => {
  const primaryFlight = option.flights?.[0];
  const primaryTransport = option.transports?.[0] || option.transport?.[0];
  const primaryHotel = option.hotels?.[0];

  // Image mapped based on destination or default fallback
  const getDestinationImage = (dest?: string) => {
    if (primaryHotel?.image_url) return primaryHotel.image_url;
    if (dest?.includes("ОАЭ") || dest?.includes("Хайм")) {
      return "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80";
    }
    if (dest?.includes("Анталь") || dest?.includes("Турци") || dest?.includes("Белек")) {
      return "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=600&q=80";
    }
    if (dest?.includes("Сочи") || dest?.includes("Полян")) {
      return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=600&q=80";
    }
    if (dest?.includes("Стамбул")) {
      return "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=600&q=80";
    }
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80";
  };

  const imageSrc = getDestinationImage(option.destination || option.title);
  const flightStops = primaryFlight?.stops ?? 0;
  const flightStopsSuffix = flightStops === 1 ? "а" : flightStops < 5 ? "и" : "ек";

  return (
    <div
      className={`group bg-surface-container-lowest border transition-all duration-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs hover:shadow-card-hover ${
        selected
          ? "border-header ring-2 ring-header/20 bg-header/5"
          : "border-surface-container-high hover:border-outline-variant/80"
      }`}
    >
      {/* Left: Image & summary */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto min-w-0">
        <div className="w-full sm:w-36 h-24 rounded-lg overflow-hidden shrink-0 bg-surface-container-highest relative">
          <img
            src={imageSrc}
            alt={option.destination || option.title || "Тур"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {option.score && (
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest/90 backdrop-blur-xs text-[10px] font-semibold text-content-primary flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              <span>{(option.score / 20).toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm sm:text-base font-bold text-content-primary leading-tight truncate">
              {option.destination || option.title}
            </h4>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
              Рекомендуем
            </span>
          </div>

          <p className="text-xs text-content-secondary line-clamp-2 leading-relaxed">
            {option.description ||
              "Идеальный пологий песок, тёплое спокойное море и короткий трансфер для всей семьи."}
          </p>

          <div className="flex items-center gap-2 text-[11px] text-content-muted mt-0.5">
            <span className="flex items-center gap-1">
              {!primaryFlight && primaryTransport ? (
                <Train className="w-3 h-3 text-header" />
              ) : (
                <Plane className="w-3 h-3 text-header" />
              )}
              <span>
                {primaryFlight
                  ? flightStops === 0
                    ? "Прямой рейс"
                    : `${flightStops} пересадк${flightStopsSuffix}${
                        primaryFlight.transit_point ? ` (${primaryFlight.transit_point})` : ""
                      }`
                  : primaryTransport
                  ? primaryTransport.stops && primaryTransport.stops > 0
                    ? `Стыковка (${primaryTransport.transit_point || "пересадка"})`
                    : primaryTransport.carrier || "Поезд РЖД"
                  : "Удобный перелёт"}
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-content-muted" />
              <span>Трансфер включён</span>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Pricing & CTA */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 gap-3 border-t sm:border-t-0 border-surface-container-high/60 pt-2 sm:pt-0">
        <div className="text-left sm:text-right">
          <div className="text-base sm:text-lg font-bold text-header leading-tight">
            ~{formatPrice(option.total_price, option.currency)}
          </div>
          <div className="text-[11px] text-content-muted">
            за 7 ночей, семья
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect?.(option)}
          className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-xs flex items-center gap-1.5 active:scale-95 ${
            selected
              ? "bg-header text-white"
              : "bg-header/90 hover:bg-header text-white"
          }`}
        >
          {selected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Выбрано</span>
            </>
          ) : (
            <>
              <span>Выбрать</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

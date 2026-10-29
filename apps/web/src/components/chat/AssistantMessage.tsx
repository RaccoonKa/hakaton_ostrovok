import React from "react";
import { ChatMessage, TripOption } from "../../types/travel";
import { ClarificationChips } from "./ClarificationChips";
import { TripOptionCard } from "../cards/TripOptionCard";
import { FlightCard } from "../cards/FlightCard";
import { HotelCard } from "../cards/HotelCard";
import { DayTimeline } from "../itinerary/DayTimeline";
import { PriceBreakdown, PriceOptimizationDiff } from "../cards/PriceBreakdown";
import { MarkdownText } from "../common/MarkdownText";
import { formatDisplayTime } from "@corvax/shared";

interface AssistantMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
  tripOptions?: TripOption[];
  selectedOption?: TripOption | null;
  optimizationDiff?: PriceOptimizationDiff | null;
  onSelectOption?: (option: TripOption) => void;
  onSelectChip?: (text: string) => void;
  onConfirmDemoBooking?: () => void;
}

export const AssistantMessage: React.FC<AssistantMessageProps> = ({
  message,
  isStreaming = false,
  tripOptions = [],
  selectedOption,
  optimizationDiff,
  onSelectOption,
  onSelectChip,
  onConfirmDemoBooking,
}) => {
  const formatTime = (isoString?: string) => {
    const raw = isoString || (message as { timestamp?: string }).timestamp;
    const formatted = formatDisplayTime(raw);
    if (formatted) return formatted;
    return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  const selectedOptionId = selectedOption?.id;
  const hasTripOptions = tripOptions.length > 0;
  const showDossier = selectedOption !== null && selectedOption !== undefined;

  return (
    <div className="flex flex-col gap-2 w-full animate-fade-in pr-2 sm:pr-8">
      {/* Assistant Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-header text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
          О!
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-xs sm:text-sm text-content-primary">
            О!дин запрос
          </span>
          <span className="text-xs text-content-muted">
            • {formatTime(message.created_at)}
          </span>
        </div>
      </div>

      {/* Assistant Body Container */}
      <div className="ml-0 sm:ml-9 flex flex-col gap-3">
        {/* Text bubble */}
        {message.content && (
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-surface-container-highest/60 text-content-primary">
            <MarkdownText content={message.content} />

            {/* Clarification / Dynamic Suggestion Chips if no option selected yet */}
            {!showDossier && !isStreaming && Boolean(message.suggestions && message.suggestions.length > 0) && (
              <ClarificationChips
                chips={message.suggestions}
                onSelectChip={onSelectChip}
              />
            )}
          </div>
        )}

        {/* Structured Recommendations List (Screen 2) */}
        {hasTripOptions && !showDossier && (
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-xs border border-surface-container-highest/60 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-content-primary">
                Рекомендованные варианты поездки:
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {tripOptions.map((opt) => (
                <TripOptionCard
                  key={opt.id || opt.title}
                  option={opt}
                  selected={selectedOptionId === opt.id}
                  onSelect={onSelectOption}
                />
              ))}
            </div>
          </div>
        )}

        {/* Curated Trip Dossier View (Screen 3 & 4) */}
        {showDossier && (
          <div className="bg-surface-container-lowest rounded-2xl p-4 sm:p-6 border border-surface-container-highest/60 flex flex-col gap-5 shadow-xs">
            {/* Dossier Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-container-highest/60 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-semibold">
                    {selectedOption.isDemo ? "Демо-маршрут" : "Тур сформирован"}
                  </span>
                  <span className="text-xs text-content-muted">
                    {selectedOption.hotels?.[0]?.check_in && selectedOption.hotels?.[0]?.check_out
                      ? `${selectedOption.hotels[0].check_in} – ${selectedOption.hotels[0].check_out}`
                      : "Даты согласованы"}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-content-primary">
                  {selectedOption.destination || selectedOption.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => onSelectOption?.(null as any)}
                className="self-start sm:self-auto text-xs text-header hover:underline font-medium cursor-pointer"
              >
                ← Вернуться к списку направлений
              </button>
            </div>

            {/* Flight section */}
            {selectedOption.flights?.[0] && (
              <FlightCard
                flight={selectedOption.flights[0]}
                returnFlight={selectedOption.flights[1]}
                isIncluded
              />
            )}

            {/* Hotel section */}
            {selectedOption.hotels?.[0] && (
              <HotelCard hotel={selectedOption.hotels[0]} />
            )}

            {/* 4-segment chronological timeline */}
            <DayTimeline option={selectedOption} />

            {/* Itemized price breakdown & diff summary */}
            <PriceBreakdown
              budget={selectedOption.budget}
              currency={selectedOption.currency}
              optimizationDiff={optimizationDiff}
              onConfirmDemo={onConfirmDemoBooking}
              confirmLabel="Забронировать тур"
            />
          </div>
        )}
      </div>
    </div>
  );
};

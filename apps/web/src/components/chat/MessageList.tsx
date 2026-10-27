import React, { useRef, useEffect } from "react";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";
import { ChatMessage, TripOption } from "../../types/travel";
import { PriceOptimizationDiff } from "../cards/PriceBreakdown";
import { ShieldCheck } from "lucide-react";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  tripOptions?: TripOption[];
  selectedOption?: TripOption | null;
  optimizationDiff?: PriceOptimizationDiff | null;
  onSelectOption?: (option: TripOption) => void;
  onSelectChip?: (text: string) => void;
  onConfirmDemoBooking?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming = false,
  tripOptions = [],
  selectedOption,
  optimizationDiff,
  onSelectOption,
  onSelectChip,
  onConfirmDemoBooking,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, selectedOption, tripOptions]);

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-6 pt-4 pb-44 flex flex-col gap-6">
      {/* Session header badge */}
      <div className="flex items-center justify-between py-1.5 px-3.5 rounded-full bg-surface-container-low border border-surface-container-highest/40 shadow-xs text-xs">
        <div className="flex items-center gap-2 truncate text-content-secondary">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
          <span className="font-medium text-content-primary">
            Умный ассистент путешествий
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-surface-container px-2.5 py-0.5 rounded-full text-[11px] text-content-secondary font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Гарантия честных цен</span>
        </div>
      </div>

      {/* Message Turns */}
      {messages.map((msg, idx) => {
        const isLastAi = msg.type === "ai" && idx === messages.length - 1;

        if (msg.type === "human") {
          return <UserMessage key={msg.id || idx} message={msg} />;
        }

        return (
          <AssistantMessage
            key={msg.id || idx}
            message={msg}
            isStreaming={isLastAi && isStreaming}
            tripOptions={
              msg.trip_options ||
              msg.tripOptions ||
              (isLastAi ? tripOptions : [])
            }
            selectedOption={isLastAi ? selectedOption : null}
            optimizationDiff={isLastAi ? optimizationDiff : null}
            onSelectOption={onSelectOption}
            onSelectChip={onSelectChip}
            onConfirmDemoBooking={onConfirmDemoBooking}
          />
        );
      })}

      {/* Real-time thinking bubble while waiting for AI response */}
      {isStreaming && (messages.length === 0 || messages[messages.length - 1].type === "human") && (
        <div className="flex items-center gap-3 animate-fade-in text-xs text-content-muted py-1 pr-2 sm:pr-8">
          <div className="w-7 h-7 rounded-lg bg-header text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            О!
          </div>
          <div className="flex items-center gap-2 bg-surface-container-lowest border border-surface-container-highest/60 rounded-2xl px-4 py-2.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-xs text-content-secondary font-medium">
              Анализирую параметры поездки и подбираю варианты...
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
};

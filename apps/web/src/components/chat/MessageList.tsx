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
      {/* Context Indicator & Progress Anchor (Screen 2 & 3) */}
      <div className="flex items-center justify-between py-2 px-3.5 rounded-full bg-surface-container-low border border-surface-container-highest/40 shadow-xs text-xs">
        <div className="flex items-center gap-2 truncate text-content-secondary">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
          <span className="font-mono text-[11px] text-content-muted uppercase tracking-wider">
            Сессия #RU-8821
          </span>
          <span>•</span>
          <span className="truncate font-medium text-content-primary">
            Семейный тур • Ноябрь
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 bg-surface-container px-2.5 py-0.5 rounded-full text-[11px] text-content-secondary font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Расчёт: 2 взр + 1 реб (7 ночей)</span>
          <span className="sm:hidden">2+1 реб</span>
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
            tripOptions={isLastAi ? tripOptions : []}
            selectedOption={isLastAi ? selectedOption : null}
            optimizationDiff={isLastAi ? optimizationDiff : null}
            onSelectOption={onSelectOption}
            onSelectChip={onSelectChip}
            onConfirmDemoBooking={onConfirmDemoBooking}
          />
        );
      })}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
};

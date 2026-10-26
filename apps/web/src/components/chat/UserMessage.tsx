import React from "react";
import { CheckCheck } from "lucide-react";
import { ChatMessage } from "../../types/travel";

interface UserMessageProps {
  message: ChatMessage;
}

export const UserMessage: React.FC<UserMessageProps> = ({ message }) => {
  const formatTime = (isoString?: string) => {
    if (!isoString) {
      return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime())
        ? isoString
        : d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex justify-end w-full animate-fade-in pl-10">
      <div className="max-w-[85%] sm:max-w-xl bg-surface-container text-content-primary rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs flex flex-col gap-1 border border-surface-container-highest/60">
        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal">
          {message.content}
        </p>

        <div className="flex items-center justify-end gap-1 text-[11px] text-content-muted pt-0.5">
          <span>{formatTime(message.created_at)}</span>
          <CheckCheck className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>
    </div>
  );
};

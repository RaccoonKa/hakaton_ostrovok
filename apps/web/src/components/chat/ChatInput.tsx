import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  SlidersHorizontal,
  Mic,
  Calendar,
  DollarSign,
  Users,
  Sparkles,
} from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  suggestions?: string[];
  placeholder?: string;
}

const DEFAULT_SUGGESTIONS = [
  "«Сравни отели Rixos в ОАЭ и Турции»",
  "«Сделай вылет на 2 дня позже»",
  "«Уложись до 130 000 ₽»",
  "«Нужна ли виза в ОАЭ для ребёнка?»",
  "«Покажи только отели с подогреваемым бассейном»",
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading = false,
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = "Спросите что угодно или уточните параметры путешествия...",
}) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut ⌘K / Ctrl+K to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setText("");
  };

  const handleSuggestionClick = (suggestionText: string) => {
    // Strip quotes if any
    const cleanText = suggestionText.replace(/^«|»$/g, "");
    setText(cleanText);
    inputRef.current?.focus();
  };

  const appendTag = (tag: string) => {
    setText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${tag}: ` : `${tag}: `;
    });
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
      {/* Quick suggestions bar */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar select-none">
          <span className="text-content-muted shrink-0 font-mono text-[11px] mr-1 hidden sm:inline">
            Быстрый ответ:
          </span>
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleSuggestionClick(item)}
              className="shrink-0 px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-content-primary transition-colors text-xs flex items-center gap-1 shadow-xs active:scale-95"
            >
              <span>{item}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main input box */}
      <form
        onSubmit={handleSubmit}
        className="bg-surface-container-lowest rounded-2xl shadow-lg border border-surface-container-highest/80 p-2 sm:p-2.5 flex flex-col gap-2 focus-within:ring-2 focus-within:ring-primary/20 transition-all backdrop-blur-md"
      >
        {/* Modifier tags line */}
        <div className="flex items-center flex-wrap gap-1 px-1">
          <button
            type="button"
            onClick={() => appendTag("+ Даты")}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low hover:bg-surface-container text-content-secondary hover:text-content-primary text-[11px] font-medium transition-colors"
          >
            <Calendar className="w-3 h-3 text-content-muted" />
            <span>+ Даты</span>
          </button>
          <button
            type="button"
            onClick={() => appendTag("+ Бюджет")}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low hover:bg-surface-container text-content-secondary hover:text-content-primary text-[11px] font-medium transition-colors"
          >
            <DollarSign className="w-3 h-3 text-content-muted" />
            <span>+ Бюджет</span>
          </button>
          <button
            type="button"
            onClick={() => appendTag("+ С детьми")}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low hover:bg-surface-container text-content-secondary hover:text-content-primary text-[11px] font-medium transition-colors"
          >
            <Users className="w-3 h-3 text-content-muted" />
            <span>+ С детьми</span>
          </button>
        </div>

        {/* Input & action controls */}
        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            title="Параметры поиска"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-container transition-colors shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none text-content-primary placeholder-content-muted text-xs sm:text-sm font-normal"
          />

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title="Голосовой ввод (демо)"
              onClick={() => setText("Хочу в Рас-эль-Хайму на 7 ночей в ноябре с ребёнком")}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-content-muted hover:text-content-primary hover:bg-surface-container transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              title="Отправить (Enter)"
              className="w-9 h-9 rounded-xl bg-primary-container hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-xs transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Reassurance caption */}
      <div className="text-center">
        <span className="text-[11px] text-content-muted select-none">
          AI-ассистент анализирует перелёты, температуру воды и спецтарифы в реальном времени • Шорткат <kbd className="font-mono bg-surface-container px-1 py-0.5 rounded text-[10px]">⌘K</kbd>
        </span>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from "react";
import { SearchFiltersPopover } from "./SearchFiltersPopover";
import {
  Send,
  SlidersHorizontal,
  Mic,
} from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading?: boolean;
  suggestions?: string[];
  placeholder?: string;
  isFiltersOpen?: boolean;
  onToggleFilters?: () => void;
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
  isFiltersOpen: externalIsFiltersOpen,
  onToggleFilters,
}) => {
  const [text, setText] = useState("");
  const [localIsFiltersOpen, setLocalIsFiltersOpen] = useState(false);
  const isFiltersOpen =
    externalIsFiltersOpen !== undefined ? externalIsFiltersOpen : localIsFiltersOpen;
  const [isListening, setIsListening] = useState(false);
  const chatFormRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    if (isListening) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          focusInputAtEnd();
        }
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

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

  const focusInputAtEnd = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  };

  const handleApplyFilters = (formattedText: string) => {
    if (!formattedText) return;
    setText((prev) => {
      let result = prev.trim();
      result = result.replace(/\+?\s*Даты:[^+]*/gi, "").trim();
      result = result.replace(/\+?\s*Бюджет:[^+]*/gi, "").trim();
      result = result.replace(/\+?\s*(Гости|Компания|С детьми):[^+]*/gi, "").trim();
      result = result.replace(/\+?\s*\d+\s*(взросл\w*|взр|детей|реб\w*)[^+]*/gi, "").trim();

      return result ? `${result} ${formattedText}` : formattedText;
    });
    setLocalIsFiltersOpen(false);
    focusInputAtEnd();
    requestAnimationFrame(focusInputAtEnd);
  };

  // Auto-focus input when component mounts or when loading finishes
  useEffect(() => {
    if (!isLoading) {
      focusInputAtEnd();
    }
  }, [isLoading]);

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
    focusInputAtEnd();
    requestAnimationFrame(() => {
      focusInputAtEnd();
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-2">
      {/* Quick suggestions bar */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar select-none">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
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
        ref={chatFormRef}
        onSubmit={handleSubmit}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            focusInputAtEnd();
          }
        }}
        className="bg-surface-container-lowest rounded-2xl shadow-lg border border-surface-container-highest/80 p-2 sm:p-2.5 flex flex-col gap-2 focus-within:ring-2 focus-within:ring-header/25 focus-within:border-header/40 transition-all duration-200 backdrop-blur-md"
      >
        {/* Input & action controls */}
        <div className="flex items-center gap-2 px-1">
          <button
            type="button"
            data-filters-toggle="true"
            title="Параметры поиска"
            onClick={onToggleFilters || (() => setLocalIsFiltersOpen((prev) => !prev))}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
              isFiltersOpen
                ? "bg-primary text-white shadow-xs"
                : "text-content-muted hover:text-content-primary hover:bg-surface-container"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {!onToggleFilters && (
            <SearchFiltersPopover
              isOpen={localIsFiltersOpen}
              onClose={() => setLocalIsFiltersOpen(false)}
              onApply={handleApplyFilters}
              anchorRef={chatFormRef}
            />
          )}

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
            className="flex-1 bg-transparent border-none outline-none text-content-primary placeholder-content-muted text-xs sm:text-sm font-normal"
          />

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title={isListening ? "Слушаю..." : "Голосовой ввод"}
              onClick={handleVoiceInput}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isListening
                  ? "text-red-500 bg-red-500/10 animate-pulse"
                  : "text-content-muted hover:text-content-primary hover:bg-surface-container"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              title="Отправить (Enter)"
              className="w-9 h-9 rounded-xl bg-header hover:bg-header-hover disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-xs transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

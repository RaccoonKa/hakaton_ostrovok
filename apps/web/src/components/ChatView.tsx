import React, { useState, useRef } from "react";
import {
  Sun,
  Building,
  Mountain,
  Sparkles,
  ArrowUpRight,
  Send,
  Calendar,
  DollarSign,
  Users,
} from "lucide-react";
import { MessageList } from "./chat/MessageList";
import { ChatInput } from "./chat/ChatInput";
import { DemoBookingModal } from "./booking/DemoBookingModal";
import { DateRangePicker } from "./common/DateRangePicker";
import { useTravelAgent } from "../hooks/useTravelAgent";
import { useSidebar } from "../context/SidebarContext";
import { SHARED_SUGGESTIONS, SHARED_QUICK_CHIPS } from "@corvax/shared";

interface ChatViewProps {
  externalHistoryTrigger?: string | null;
}

export const ChatView: React.FC<ChatViewProps> = () => {
  const {
    messages,
    isLoading,
    tripOptions,
    selectedOption,
    optimizationDiff,
    isBookingModalOpen,
    sendMessage,
    selectOption,
    openBookingModal,
    closeBookingModal,
  } = useTravelAgent();

  const { isSidebarOpen } = useSidebar();
  const [heroInput, setHeroInput] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const heroFormRef = useRef<HTMLFormElement>(null);
  const heroTextareaRef = useRef<HTMLTextAreaElement>(null);

  const focusHeroInputAtEnd = () => {
    if (heroTextareaRef.current) {
      heroTextareaRef.current.focus();
      const len = heroTextareaRef.current.value.length;
      heroTextareaRef.current.setSelectionRange(len, len);
    }
  };

  const handleApplyDates = (datesText: string) => {
    setHeroInput((prev) => {
      const dateRegex = /(\+?\s*Даты:\s*)[^\n,+]*/i;
      if (dateRegex.test(prev)) {
        return prev.replace(dateRegex, `+ ${datesText}`);
      }
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} + ${datesText}` : `+ ${datesText}`;
    });
    setIsDatePickerOpen(false);
    focusHeroInputAtEnd();
    requestAnimationFrame(focusHeroInputAtEnd);
  };

  const handleHeroSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!heroInput.trim() || isLoading) return;
    sendMessage(heroInput.trim());
    setHeroInput("");
  };

  const appendHeroTag = (tag: string) => {
    setHeroInput((prev) => {
      const trimmed = prev.trim();
      const tagWithColon = `${tag}:`;
      const existingIndex = trimmed.indexOf(tagWithColon);
      if (existingIndex !== -1) {
        requestAnimationFrame(() => {
          if (heroTextareaRef.current) {
            heroTextareaRef.current.focus();
            const targetPos = existingIndex + tagWithColon.length + 1;
            heroTextareaRef.current.setSelectionRange(targetPos, targetPos);
          }
        });
        return prev;
      }
      return trimmed ? `${trimmed} ${tag}: ` : `${tag}: `;
    });

    focusHeroInputAtEnd();
    requestAnimationFrame(() => {
      focusHeroInputAtEnd();
    });
  };

  const getSuggestionIcon = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("море") || lower.includes("пляж") || lower.includes("июле")) {
      return Sun;
    }
    if (lower.includes("лыжи") || lower.includes("сочи") || lower.includes("январе")) {
      return Mountain;
    }
    if (lower.includes("стамбул") || lower.includes("отель") || lower.includes("тур")) {
      return Building;
    }
    return Sparkles;
  };

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-3.5rem)]">
      {/* Background ambient radial glow matching Stitch */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[38rem] h-[22rem] bg-gradient-to-b from-header/20 via-surface-container-low/20 to-transparent blur-3xl opacity-70 -z-10" />

      {/* Screen 1: Welcome / Empty Dashboard Hero */}
      {messages.length === 0 ? (
        <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center text-center my-auto px-4 sm:px-6 py-12 z-10 animate-fade-in">
          {/* Heading */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-content-primary tracking-tight mb-2">
            Куда хотите поехать?
          </h1>
          <p className="text-sm sm:text-base text-content-muted max-w-lg mb-8 leading-relaxed">
            Опишите поездку своими словами: даты, бюджет, пожелания к пляжу или компании.
            ИИ подберёт честные варианты и соберёт готовый маршрут.
          </p>

          {/* Hero text area input */}
          <form
            ref={heroFormRef}
            onSubmit={handleHeroSubmit}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                focusHeroInputAtEnd();
              }
            }}
            className="w-full text-left rounded-2xl bg-surface shadow-md border border-surface-border p-4 focus-within:shadow-lg focus-within:border-primary/50 transition-all duration-200"
          >
            <label htmlFor="travel-prompt-input" className="sr-only">
              Запрос для путешествия
            </label>
            <textarea
              ref={heroTextareaRef}
              id="travel-prompt-input"
              rows={3}
              value={heroInput}
              onChange={(e) => setHeroInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleHeroSubmit();
                }
              }}
              placeholder="Например: Хочу куда-нибудь к тёплому морю в ноябре, недорого, с ребёнком, без долгих перелётов..."
              className="w-full resize-none bg-transparent text-sm sm:text-base text-content-primary placeholder:text-content-muted focus:outline-hidden leading-relaxed"
            />

            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-surface-border flex-wrap">
              {/* Tag modifier chips */}
              <div className="flex items-center flex-wrap gap-1.5">
                <div className="relative">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsDatePickerOpen((prev) => !prev)}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      isDatePickerOpen
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface-muted hover:bg-surface-subtle text-content-secondary hover:text-content-primary"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>+ Даты</span>
                  </button>

                  <DateRangePicker
                    isOpen={isDatePickerOpen}
                    onClose={() => setIsDatePickerOpen(false)}
                    onApply={handleApplyDates}
                    anchorRef={heroFormRef}
                  />
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => appendHeroTag("+ Бюджет")}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-muted hover:bg-surface-subtle text-content-secondary hover:text-content-primary text-xs font-medium transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5 text-content-muted" />
                  <span>+ Бюджет</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => appendHeroTag("+ С детьми")}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-muted hover:bg-surface-subtle text-content-secondary hover:text-content-primary text-xs font-medium transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-content-muted" />
                  <span>+ С детьми</span>
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!heroInput.trim() || isLoading}
                className="w-9 h-9 rounded-full bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-xs transition-all active:scale-95 shrink-0"
                title="Отправить запрос"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick template starter buttons from SHARED_SUGGESTIONS */}
          <div className="w-full flex flex-col gap-2 mt-6 text-left">
            {SHARED_SUGGESTIONS.map((suggestionText) => {
              const IconComp = getSuggestionIcon(suggestionText);
              return (
                <button
                  key={suggestionText}
                  type="button"
                  onClick={() => sendMessage(suggestionText)}
                  className="w-full p-3.5 rounded-xl bg-surface hover:bg-surface-muted text-content-primary flex items-center justify-between group transition-colors shadow-xs border border-surface-border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComp className="w-4 h-4 text-primary shrink-0 transition-colors" />
                    <span className="text-xs sm:text-sm text-content-primary truncate">
                      {suggestionText}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Screens 2, 3, 4: Active Chat Flow */
        <div className="flex-1 flex flex-col w-full">
          <MessageList
            messages={messages}
            isStreaming={isLoading}
            tripOptions={tripOptions}
            selectedOption={selectedOption}
            optimizationDiff={optimizationDiff}
            onSelectOption={(opt) => selectOption(opt)}
            onSelectChip={(chip) => sendMessage(chip)}
            onConfirmDemoBooking={openBookingModal}
          />

          {/* Docked Bottom Floating Prompt Bar with smooth left transition */}
          <div
            className={`fixed bottom-0 right-0 p-3 sm:p-4 pointer-events-none z-30 bg-gradient-to-t from-canvas via-canvas/90 to-transparent pt-8 transition-all duration-300 ease-in-out ${
              isSidebarOpen ? "left-0 md:left-64" : "left-0"
            }`}
          >
            <div className="pointer-events-auto">
              <ChatInput
                onSendMessage={(text) => sendMessage(text)}
                isLoading={isLoading}
                suggestions={SHARED_QUICK_CHIPS as unknown as string[]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation Modal */}
      <DemoBookingModal
        isOpen={isBookingModalOpen}
        onClose={closeBookingModal}
        tripOption={selectedOption}
        totalAmount={optimizationDiff?.newTotal ?? selectedOption?.total_price}
      />
    </div>
  );
};

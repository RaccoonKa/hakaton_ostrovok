import React, { useState } from "react";
import {
  Sun,
  Building,
  Mountain,
  ArrowUpRight,
  Send,
  Calendar,
  DollarSign,
  Users,
  Sparkles,
} from "lucide-react";
import { MessageList } from "./chat/MessageList";
import { ChatInput } from "./chat/ChatInput";
import { DemoBookingModal } from "./booking/DemoBookingModal";
import { useTravelAgent } from "../hooks/useTravelAgent";

const HERO_TEMPLATES = [
  {
    icon: Sun,
    text: "К тёплому морю в ноябре с ребёнком 5 лет, до 150 000 ₽",
  },
  {
    icon: Building,
    text: "Уикенд в Стамбуле на двоих с уютным отелем в Бейоглу",
  },
  {
    icon: Mountain,
    text: "Горные лыжи в Сочи на 5 дней без очередей на подъёмники",
  },
];

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

  const [heroInput, setHeroInput] = useState("");

  const handleHeroSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!heroInput.trim() || isLoading) return;
    sendMessage(heroInput.trim());
    setHeroInput("");
  };

  const appendHeroTag = (tag: string) => {
    setHeroInput((prev) => (prev ? `${prev} ${tag}: ` : `${tag}: `));
  };

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-3.5rem)]">
      {/* Background ambient radial glow matching Stitch */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[38rem] h-[22rem] bg-gradient-to-b from-primary-fixed/30 via-surface-container-low/20 to-transparent blur-3xl opacity-70 -z-10" />

      {/* Screen 1: Welcome / Empty Dashboard Hero */}
      {messages.length === 0 ? (
        <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center text-center my-auto px-4 sm:px-6 py-12 z-10 animate-fade-in">
          {/* Tag pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-content-secondary text-xs font-medium mb-4 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Интеллектуальный подбор поездок</span>
          </div>

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
            onSubmit={handleHeroSubmit}
            className="w-full text-left rounded-2xl bg-surface-container-lowest shadow-md border border-surface-container-highest/80 p-4 focus-within:shadow-lg focus-within:border-primary/40 transition-all duration-200"
          >
            <label htmlFor="travel-prompt-input" className="sr-only">
              Запрос для путешествия
            </label>
            <textarea
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

            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-surface-container-highest/40 flex-wrap">
              {/* Tag modifier chips */}
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => appendHeroTag("+ Даты")}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-content-secondary hover:text-content-primary text-xs font-medium transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 text-content-muted" />
                  <span>Даты</span>
                </button>
                <button
                  type="button"
                  onClick={() => appendHeroTag("+ Бюджет")}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-content-secondary hover:text-content-primary text-xs font-medium transition-colors"
                >
                  <DollarSign className="w-3.5 h-3.5 text-content-muted" />
                  <span>Бюджет</span>
                </button>
                <button
                  type="button"
                  onClick={() => appendHeroTag("+ С детьми")}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-content-secondary hover:text-content-primary text-xs font-medium transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-content-muted" />
                  <span>С детьми</span>
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={!heroInput.trim() || isLoading}
                className="w-9 h-9 rounded-full bg-primary-container hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shadow-xs transition-all active:scale-95 shrink-0"
                title="Отправить запрос"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick template starter buttons */}
          <div className="w-full flex flex-col gap-2 mt-6 text-left">
            {HERO_TEMPLATES.map((tmpl) => {
              const IconComp = tmpl.icon;
              return (
                <button
                  key={tmpl.text}
                  type="button"
                  onClick={() => sendMessage(tmpl.text)}
                  className="w-full p-3.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-content-primary flex items-center justify-between group transition-colors shadow-xs border border-surface-container-highest/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <IconComp className="w-4 h-4 text-content-muted shrink-0 group-hover:text-primary transition-colors" />
                    <span className="text-xs sm:text-sm text-content-primary truncate">
                      {tmpl.text}
                    </span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Screen 1 Footer Note */}
          <footer className="w-full max-w-xl text-center pt-8">
            <p className="text-xs text-content-muted leading-relaxed">
              О!дин запрос работает в демонстрационном режиме. Бронирования и тарифы
              симулируются для комфортного тестирования сценариев.
            </p>
          </footer>
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

          {/* Docked Bottom Floating Prompt Bar */}
          <div className="fixed bottom-0 left-0 md:left-64 right-0 p-3 sm:p-4 pointer-events-none z-30 bg-gradient-to-t from-canvas via-canvas/90 to-transparent pt-8">
            <div className="pointer-events-auto">
              <ChatInput
                onSendMessage={(text) => sendMessage(text)}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Simulated Booking Modal (Screen 4) */}
      <DemoBookingModal
        isOpen={isBookingModalOpen}
        onClose={closeBookingModal}
        tripOption={selectedOption}
        totalAmount={optimizationDiff?.newTotal ?? selectedOption?.total_price}
      />
    </div>
  );
};

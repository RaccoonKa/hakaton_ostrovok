import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { ChatMessage, TripOption, TravelApiClient } from "@corvax/shared";
import { TripCard } from "./TripCard";
import { DemoBadge } from "./DemoBadge";

const SUGGESTIONS = [
  "Хочу в Сочи на неделю в июле, 2 взрослых, бюджет до 100 000 ₽",
  "Подбери тур в Анталью с отелем 5★ и первой линией",
  "Выходные в Стамбуле: отель возле достопримечательностей",
];

export const ChatView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      type: "ai",
      content:
        "Здравствуйте! Я AI-ассистент «О!дин запрос». Опишите путешествие вашей мечты обычными словами — куда, когда и с кем вы хотите отправиться, и я подберу готовый маршрут с отелями, перелётами и бюджетом.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef(new TravelApiClient());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, tripOptions]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input.trim();
    if (!text || isLoading) return;

    setInput("");
    setIsLoading(true);
    setBookingSuccess(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      type: "human",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantMsgId = `ai-${Date.now()}`;
    let assistantText = "";

    await clientRef.current.sendMessage(
      text,
      { mockFallback: true },
      {
        onToken: (token) => {
          assistantText += token;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.id === assistantMsgId) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: assistantText },
              ];
            }
            return [
              ...prev,
              {
                id: assistantMsgId,
                type: "ai",
                content: assistantText,
              },
            ];
          });
        },
        onTripOptions: (options) => {
          setTripOptions(options);
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              type: "ai",
              content: `Произошла ошибка при обращении к сервису: ${err instanceof Error ? err.message : String(err)}`,
            },
          ]);
        },
        onComplete: () => {
          setIsLoading(false);
        },
      }
    );
  };

  const handleReset = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        type: "ai",
        content:
          "Диалог начат заново. Куда планируете отправиться в этот раз?",
      },
    ]);
    setTripOptions([]);
    setSelectedOption(null);
    setBookingSuccess(false);
  };

  const handleBookDemo = () => {
    if (!selectedOption) return;
    setBookingSuccess(true);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4 py-4 md:py-6">
      {/* Header */}
      <header className="flex items-center justify-between pb-4 border-b border-surface-border mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
            О!
          </div>
          <div>
            <h1 className="text-lg font-bold text-content-primary leading-tight">
              О!дин запрос
            </h1>
            <p className="text-xs text-content-muted">
              AI Travel Planning Assistant • Ostrovok Hackathon 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DemoBadge />
          <button
            type="button"
            onClick={handleReset}
            title="Начать новый диалог"
            className="p-2 rounded-xl text-content-secondary hover:bg-surface-muted transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === "human" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 leading-relaxed text-sm ${
                msg.type === "human"
                  ? "bg-primary text-white rounded-br-sm shadow-sm"
                  : "bg-surface text-content-primary border border-surface-border rounded-bl-sm shadow-card"
              }`}
            >
              {msg.type === "ai" && (
                <div className="flex items-center gap-1.5 text-primary mb-1.5 font-semibold text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ассистент</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-surface-border rounded-2xl rounded-bl-sm px-5 py-3 shadow-card flex items-center gap-2 text-sm text-content-secondary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Ассистент подбирает варианты...</span>
            </div>
          </div>
        )}

        {/* Trip options section */}
        {tripOptions.length > 0 && (
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-content-primary">
                Рекомендованные варианты поездки
              </h2>
              <DemoBadge />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tripOptions.map((opt) => (
                <TripCard
                  key={opt.id}
                  option={opt}
                  selected={selectedOption?.id === opt.id}
                  onSelect={(o) => setSelectedOption(o)}
                />
              ))}
            </div>

            {selectedOption && (
              <div className="bg-surface rounded-2xl border border-primary/40 p-5 mt-4 shadow-card">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-primary font-semibold uppercase">
                      Выбранный тур для демонстрации
                    </div>
                    <div className="text-base font-bold text-content-primary">
                      {selectedOption.title}
                    </div>
                    <div className="text-xs text-content-muted mt-1">
                      Оформление демо-поездки: бронь фиксируется в сценарии без списания средств.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBookDemo}
                    disabled={bookingSuccess}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all ${
                      bookingSuccess
                        ? "bg-tertiary"
                        : "bg-secondary hover:bg-secondary-hover shadow-sm"
                    }`}
                  >
                    {bookingSuccess ? "✓ Демо-бронь подтверждена" : "Оформить демо-бронь"}
                  </button>
                </div>

                {bookingSuccess && (
                  <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong>Демонстрационный заказ успешно сформирован!</strong>
                      <p className="mt-0.5 text-emerald-800">
                        Номер заявки: #OST-2026-DEMO. Все данные сохранены в сценарии диалога. Вы можете изменить условия или задать новый вопрос.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="py-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSend(s)}
              className="text-xs text-content-secondary bg-surface hover:bg-surface-subtle border border-surface-border px-3 py-1.5 rounded-full transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <footer className="pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 bg-surface border border-surface-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 rounded-2xl px-4 py-2.5 shadow-card transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Опишите поездку («Хочу в Сочи на 5 дней вдвоём до 80 000 ₽»)..."
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none text-content-primary placeholder-content-muted text-sm"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
};

import { useState, useCallback, useRef } from "react";
import { NativeModules } from "react-native";
import {
  TripOption,
  MOCK_TRIP_OPTIONS,
  TravelApiClient,
} from "@corvax/shared";
import { MobileChatMessage } from "../types";

export interface HistorySessionRecord {
  id: string;
  query: string;
  timestamp: string;
}

export interface UseMobileAgentOptions {
  baseUrl?: string;
}

declare const process: any;

function getDefaultBackendUrl(): string {
  if (typeof process !== "undefined" && process?.env?.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = String(scriptURL).match(/^https?:\/\/([^/:]+)/);
    if (match && match[1]) {
      const host = match[1];
      if (host.includes("exp.direct") || host.includes("ngrok")) {
        return "http://10.238.31.123:8000";
      }
      return `http://${host}:8000`;
    }
  }
  return "http://10.238.31.123:8000";
}

export function useMobileAgent(options: UseMobileAgentOptions = {}) {
  const [messages, setMessages] = useState<MobileChatMessage[]>([]);
  const [historySessions, setHistorySessions] = useState<HistorySessionRecord[]>([
    {
      id: "hist-default-1",
      query: "Тёплое море в ноябре с ребёнком до 200 000 ₽",
      timestamp: "Сегодня",
    },
    {
      id: "hist-default-2",
      query: "Горные лыжи в Сочи на двоих в январе",
      timestamp: "Вчера",
    },
  ]);

  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState(
    "Поиск: прямой рейс ≤ 5.5ч, t° воды ≥ +25°C, пологий берег"
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutOption, setCheckoutOption] = useState<TripOption | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const clientRef = useRef<TravelApiClient>(
    new TravelApiClient({
      baseUrl: options.baseUrl || getDefaultBackendUrl(),
      agentId: "travel_agent",
      useAgUi: false,
    })
  );

  const formatCurrentTime = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now() + 1}`;
      const timeStr = formatCurrentTime();

      const userMsg: MobileChatMessage = {
        id: userMsgId,
        role: "user",
        content: trimmed,
        timestamp: timeStr,
      };

      setMessages((prev) => [...prev, userMsg]);
      setHistorySessions((prev) => {
        if (prev.some((h) => h.query === trimmed)) return prev;
        return [{ id: `h-${Date.now()}`, query: trimmed, timestamp: timeStr }, ...prev];
      });
      setIsThinking(true);
      setIsStreaming(true);
      setThinkingText(
        "Анализ запроса: подбор перелетов, отелей и расчет параметров..."
      );

      let accumulatedContent = "";

      try {
        await clientRef.current.sendMessage(
          trimmed,
          { mockFallback: true },
          {
            onToken: (token: string) => {
              accumulatedContent += token;
              setIsThinking(false);
              setMessages((prev) => {
                const existingIndex = prev.findIndex((m) => m.id === assistantMsgId);
                if (existingIndex >= 0) {
                  return prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  );
                }
                return [
                  ...prev,
                  {
                    id: assistantMsgId,
                    role: "assistant",
                    content: accumulatedContent,
                    timestamp: formatCurrentTime(),
                  },
                ];
              });
            },
            onTripOptions: (options: TripOption[]) => {
              setTripOptions(options);
              setMessages((prev) => {
                const existingIndex = prev.findIndex((m) => m.id === assistantMsgId);
                if (existingIndex >= 0) {
                  return prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, tripOptions: options }
                      : msg
                  );
                }
                return [
                  ...prev,
                  {
                    id: assistantMsgId,
                    role: "assistant",
                    content: accumulatedContent,
                    timestamp: formatCurrentTime(),
                    tripOptions: options,
                  },
                ];
              });
            },
            onComplete: () => {
              setIsThinking(false);
              setIsStreaming(false);
            },
            onError: (err) => {
              console.warn("Client message error:", err);
              setIsThinking(false);
              setIsStreaming(false);
              setTripOptions(MOCK_TRIP_OPTIONS);
              setSelectedOption(null);
              setMessages((prev) => {
                const existingIndex = prev.findIndex((m) => m.id === assistantMsgId);
                const fallbackMsg: MobileChatMessage = {
                  id: assistantMsgId,
                  role: "assistant",
                  content:
                    accumulatedContent ||
                    "Я подобрал подходящие варианты путешествия с прямыми рейсами и проверенными отелями. Ознакомьтесь с предложениями ниже:",
                  timestamp: formatCurrentTime(),
                  tripOptions: MOCK_TRIP_OPTIONS,
                };
                if (existingIndex >= 0) {
                  return prev.map((msg) => (msg.id === assistantMsgId ? fallbackMsg : msg));
                }
                return [...prev, fallbackMsg];
              });
            },
          }
        );
      } catch (err) {
        console.warn("Error sending message:", err);
        setIsThinking(false);
        setIsStreaming(false);
        setTripOptions(MOCK_TRIP_OPTIONS);
        setSelectedOption(null);
        setMessages((prev) => {
          const existingIndex = prev.findIndex((m) => m.id === assistantMsgId);
          const fallbackMsg: MobileChatMessage = {
            id: assistantMsgId,
            role: "assistant",
            content:
              accumulatedContent ||
              "Я подобрал подходящие варианты путешествия с прямыми рейсами и проверенными отелями. Ознакомьтесь с предложениями ниже:",
            timestamp: formatCurrentTime(),
            tripOptions: MOCK_TRIP_OPTIONS,
          };
          if (existingIndex >= 0) {
            return prev.map((msg) => (msg.id === assistantMsgId ? fallbackMsg : msg));
          }
          return [...prev, fallbackMsg];
        });
      }
    },
    [isThinking]
  );

  const selectOption = useCallback((option: TripOption | null) => {
    setSelectedOption(option);
  }, []);

  const openCheckout = useCallback(
    (option?: TripOption) => {
      setCheckoutOption(option || selectedOption || tripOptions[0] || null);
      setCheckoutVisible(true);
    },
    [selectedOption, tripOptions]
  );

  const closeCheckout = useCallback(() => {
    setCheckoutVisible(false);
    setCheckoutOption(null);
  }, []);

  const handleBookingConfirmed = useCallback((id: string, optionTitle?: string) => {
    setConfirmedBookingId(id);
    const successMsg: MobileChatMessage = {
      id: `ai-booked-${Date.now()}`,
      role: "assistant",
      content: `Бронирование ${optionTitle ? `«${optionTitle}»` : "тура"} успешно подтверждено! Заявка #${id}. Электронные билеты и гостиничный ваучер сформированы.`,
      timestamp: formatCurrentTime(),
    };
    setMessages((prev) => [...prev, successMsg]);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setTripOptions([]);
    setSelectedOption(null);
    setIsThinking(false);
    setIsStreaming(false);
    setConfirmedBookingId(null);
  }, []);

  return {
    messages,
    tripOptions,
    selectedOption,
    isThinking,
    thinkingText,
    isStreaming,
    checkoutVisible,
    checkoutOption,
    confirmedBookingId,
    historySessions,
    sendMessage,
    selectOption,
    openCheckout,
    closeCheckout,
    handleBookingConfirmed,
    resetChat,
  };
}

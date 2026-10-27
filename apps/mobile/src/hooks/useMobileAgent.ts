import { useState, useCallback, useRef, useEffect } from "react";
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const timer1Ref = useRef<any>(null);
  const timer2Ref = useRef<any>(null);

  const clearTimers = useCallback(() => {
    if (timer1Ref.current) {
      clearTimeout(timer1Ref.current);
      timer1Ref.current = null;
    }
    if (timer2Ref.current) {
      clearTimeout(timer2Ref.current);
      timer2Ref.current = null;
    }
  }, []);

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

  const cancelRequest = useCallback(() => {
    clearTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    setIsStreaming(false);
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      cancelRequest();
    };
  }, [cancelRequest]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      cancelRequest();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now() + 1}`;
      const timeStr = formatCurrentTime();

      const userMsg: MobileChatMessage = {
        id: userMsgId,
        role: "user",
        content: trimmed,
        timestamp: timeStr,
      };

      const assistantMsg: MobileChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: timeStr,
        isThinking: true,
        thinkingStep: "analyzing_flights",
        thinkingText: "Анализирую авиарейсы и логистику...",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setHistorySessions((prev) => {
        if (prev.some((h) => h.query === trimmed)) return prev;
        return [{ id: `h-${Date.now()}`, query: trimmed, timestamp: timeStr }, ...prev];
      });
      setIsThinking(true);
      setIsStreaming(true);
      setThinkingText("Анализирую авиарейсы и логистику...");

      timer1Ref.current = setTimeout(() => {
        if (!abortController.signal.aborted) {
          setThinkingText("Подбираю проверенные отели...");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId && m.isThinking
                ? {
                    ...m,
                    thinkingStep: "finding_hotels",
                    thinkingText: "Подбираю проверенные отели...",
                  }
                : m
            )
          );
        }
      }, 700);

      timer2Ref.current = setTimeout(() => {
        if (!abortController.signal.aborted) {
          setThinkingText("Рассчитываю бюджет и оптимизацию...");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId && m.isThinking
                ? {
                    ...m,
                    thinkingStep: "calculating_budget",
                    thinkingText: "Рассчитываю бюджет и оптимизацию...",
                  }
                : m
            )
          );
        }
      }, 1500);

      let accumulatedContent = "";

      try {
        await clientRef.current.sendMessage(
          trimmed,
          { mockFallback: true },
          {
            onToken: (token: string) => {
              clearTimers();
              accumulatedContent += token;
              setIsThinking(false);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        isThinking: false,
                        content: accumulatedContent,
                      }
                    : msg
                )
              );
            },
            onTripOptions: (options: TripOption[]) => {
              setTripOptions(options);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        tripOptions: options,
                      }
                    : msg
                )
              );
            },
            onComplete: () => {
              clearTimers();
              setIsThinking(false);
              setIsStreaming(false);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        isThinking: false,
                      }
                    : msg
                )
              );
            },
            onError: (err) => {
              clearTimers();
              console.warn("Client message error:", err);
              setIsThinking(false);
              setIsStreaming(false);
              setTripOptions(MOCK_TRIP_OPTIONS);
              setSelectedOption(null);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        isThinking: false,
                        content:
                          accumulatedContent ||
                          "Я подобрал подходящие варианты путешествия с прямыми рейсами и проверенными отелями. Ознакомьтесь с предложениями ниже:",
                        tripOptions: MOCK_TRIP_OPTIONS,
                      }
                    : msg
                )
              );
            },
          },
          abortController.signal
        );
      } catch (err) {
        clearTimers();
        console.warn("Error sending message:", err);
        setIsThinking(false);
        setIsStreaming(false);
        setTripOptions(MOCK_TRIP_OPTIONS);
        setSelectedOption(null);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  isThinking: false,
                  content:
                    accumulatedContent ||
                    "Я подобрал подходящие варианты путешествия с прямыми рейсами и проверенными отелями. Ознакомьтесь с предложениями ниже:",
                  tripOptions: MOCK_TRIP_OPTIONS,
                }
              : msg
          )
        );
      }
    },
    [cancelRequest, clearTimers, isThinking]
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
    cancelRequest();
    setMessages([]);
    setTripOptions([]);
    setSelectedOption(null);
    setIsThinking(false);
    setIsStreaming(false);
    setConfirmedBookingId(null);
  }, [cancelRequest]);

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

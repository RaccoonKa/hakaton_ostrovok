import { useState, useCallback, useRef, useEffect } from "react";
import { NativeModules } from "react-native";
import {
  TripOption,
  TravelApiClient,
  normalizeTripOptions,
  UnifiedChatMessage,
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
        return "http://192.168.1.79:8000";
      }
      return `http://${host}:8000`;
    }
  }
  return "http://192.168.1.79:8000";
}

export function useMobileAgent(options: UseMobileAgentOptions = {}) {
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([]);
  const [historySessions, setHistorySessions] = useState<HistorySessionRecord[]>([]);

  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState(
    "Анализирую параметры поездки и подбираю варианты..."
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutOption, setCheckoutOption] = useState<TripOption | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const threadIdRef = useRef<string | null>(null);
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

  const [backendUrl, setBackendUrlState] = useState<string>(
    options.baseUrl || getDefaultBackendUrl()
  );

  const clientRef = useRef<TravelApiClient>(
    new TravelApiClient({
      baseUrl: options.baseUrl || getDefaultBackendUrl(),
      agentId: "travel_agent",
      useAgUi: false,
    })
  );

  const setBackendUrl = useCallback((url: string) => {
    setBackendUrlState(url);
    clientRef.current = new TravelApiClient({
      baseUrl: url,
      agentId: "travel_agent",
      useAgUi: false,
    });
  }, []);

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

      if (!threadIdRef.current) {
        threadIdRef.current = `mobile-session-${Date.now()}`;
      }

      let accumulatedContent = "";

      try {
        await clientRef.current.sendMessage(
          trimmed,
          { threadId: threadIdRef.current, mockFallback: true },
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
            onMessage: (msg: any) => {
              clearTimers();
              setIsThinking(false);
              setIsStreaming(false);

              const content = typeof msg === "string" ? msg : msg.content || "";
              const rawOptions =
                msg.custom_data?.trip_options || msg.additional_kwargs?.trip_options;
              const normalized = rawOptions
                ? normalizeTripOptions(rawOptions)
                : undefined;
              const suggestions =
                msg.custom_data?.suggestions ||
                msg.additional_kwargs?.suggestions ||
                [];

              if (normalized) {
                setTripOptions(normalized);
              }

              if (content) {
                accumulatedContent = content;
              }

              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        isThinking: false,
                        content: content || m.content,
                        trip_options: normalized ?? m.trip_options,
                        tripOptions: normalized ?? m.tripOptions,
                        suggestions:
                          suggestions.length > 0 ? suggestions : m.suggestions,
                      }
                    : m
                )
              );
            },
            onTripOptions: (options: TripOption[]) => {
              const normalized = normalizeTripOptions(options);
              setTripOptions(normalized);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        trip_options: normalized,
                        tripOptions: normalized,
                      }
                    : msg
                )
              );
            },
            onSuggestions: (sugs: string[]) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        suggestions: sugs,
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
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? {
                        ...msg,
                        isThinking: false,
                        content:
                          accumulatedContent ||
                          "Не удалось получить ответ от ассистента. Проверьте соединение с сервером.",
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
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  isThinking: false,
                  content:
                    accumulatedContent ||
                    "Ошибка подключения к сервису. Попробуйте повторить запрос позже.",
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
    threadIdRef.current = null;
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
    backendUrl,
    setBackendUrl,
    sendMessage,
    selectOption,
    openCheckout,
    closeCheckout,
    handleBookingConfirmed,
    resetChat,
  };
}

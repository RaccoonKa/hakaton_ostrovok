import { useState, useCallback, useRef } from "react";
import {
  TripOption,
  MOCK_TRIP_OPTIONS,
  TravelApiClient,
} from "@corvax/shared";
import { MobileChatMessage } from "../types";

export interface UseMobileAgentOptions {
  baseUrl?: string;
}

export function useMobileAgent(options: UseMobileAgentOptions = {}) {
  const [messages, setMessages] = useState<MobileChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Привет! Я AI-ассистент «О!дин запрос». Расскажите своими словами, куда и как вы хотите поехать — я подберу готовый маршрут с отелями, билетами и расчетом бюджета.",
      timestamp: "14:20",
    },
  ]);

  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState(
    "Поиск: прямой рейс ≤ 5.5ч, t° воды ≥ +25°C, пологий берег"
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [checkoutOption, setCheckoutOption] = useState<TripOption | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const clientRef = useRef<TravelApiClient>(
    new TravelApiClient({
      baseUrl: options.baseUrl || "http://localhost:8000",
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
      setIsThinking(true);
      setIsStreaming(true);
      setThinkingText(
        "Анализ запроса: подбор перелетов, отелей и расчет параметров..."
      );

      // Create an assistant placeholder message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
          timestamp: timeStr,
        },
      ]);

      let accumulatedContent = "";

      try {
        await clientRef.current.sendMessage(
          trimmed,
          { mockFallback: true },
          {
            onToken: (token: string) => {
              accumulatedContent += token;
              setIsThinking(false);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            },
            onTripOptions: (options: TripOption[]) => {
              setTripOptions(options);
              if (options.length > 0) {
                setSelectedOption(options[0]);
              }
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, tripOptions: options }
                    : msg
                )
              );
            },
            onComplete: () => {
              setIsThinking(false);
              setIsStreaming(false);
            },
            onError: (err) => {
              console.warn("Client message error:", err);
              setIsThinking(false);
              setIsStreaming(false);
              // Fallback ensure options are populated
              setTripOptions(MOCK_TRIP_OPTIONS);
              setSelectedOption(MOCK_TRIP_OPTIONS[0]);
            },
          }
        );
      } catch (err) {
        console.warn("Error sending message:", err);
        setIsThinking(false);
        setIsStreaming(false);
        setTripOptions(MOCK_TRIP_OPTIONS);
        setSelectedOption(MOCK_TRIP_OPTIONS[0]);
      }
    },
    [isThinking]
  );

  const selectOption = useCallback((option: TripOption) => {
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

  const handleBookingConfirmed = useCallback((id: string) => {
    setConfirmedBookingId(id);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "Привет! Я AI-ассистент «О!дин запрос». Расскажите своими словами, куда и как вы хотите поехать — я подберу готовый маршрут с отелями, билетами и расчетом бюджета.",
        timestamp: formatCurrentTime(),
      },
    ]);
    setTripOptions([]);
    setSelectedOption(null);
    setIsThinking(false);
    setIsStreaming(false);
    setConfirmedBookingId(null);
  }, []);

  const toggleListening = useCallback(() => {
    setIsListening((prev) => !prev);
  }, []);

  return {
    messages,
    tripOptions,
    selectedOption,
    isThinking,
    thinkingText,
    isStreaming,
    isListening,
    checkoutVisible,
    checkoutOption,
    confirmedBookingId,
    sendMessage,
    selectOption,
    openCheckout,
    closeCheckout,
    handleBookingConfirmed,
    resetChat,
    toggleListening,
  };
}

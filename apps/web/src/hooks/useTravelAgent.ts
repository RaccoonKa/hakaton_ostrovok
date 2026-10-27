import { useState, useRef, useCallback, useEffect } from "react";
import {
  TripOption,
  AgentStepPhase,
  ChatMessage,
} from "../types/travel";
import { PriceOptimizationDiff } from "../components/cards/PriceBreakdown";
import { TravelApiClient, normalizeTripOptions, UnifiedChatMessage } from "@corvax/shared";

export function useTravelAgent() {
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<AgentStepPhase>("idle");
  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [optimizationDiff, setOptimizationDiff] =
    useState<PriceOptimizationDiff | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const threadIdRef = useRef<string | null>(null);
  const clientRef = useRef(
    new TravelApiClient({
      baseUrl: (import.meta.env.VITE_API_URL as string) || "",
      agentId: (import.meta.env.VITE_AGENT_ID as string) || "travel_agent",
      authSecret: (import.meta.env.VITE_AUTH_SECRET as string) || undefined,
      useAgUi: import.meta.env.VITE_USE_AGUI === "true",
    })
  );

  // Cancel any running query
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setCurrentStep("idle");
  }, []);

  // Send a message and stream the response
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      cancelRequest();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setCurrentStep("analyzing_flights");

      // Append user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: "human",
        content: text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const assistantMsgId = `ai-${Date.now()}`;
      let accumulatedTokens = "";

      // Step simulation timers for UX feedback while backend processes
      const stepTimer1 = setTimeout(() => {
        if (!abortController.signal.aborted) {
          setCurrentStep("finding_hotels");
        }
      }, 700);

      const stepTimer2 = setTimeout(() => {
        if (!abortController.signal.aborted) {
          setCurrentStep("calculating_budget");
        }
      }, 1500);

      if (!threadIdRef.current) {
        threadIdRef.current = `thread-${Date.now()}`;
      }

      try {
        await clientRef.current.sendMessage(
          text,
          { threadId: threadIdRef.current, mockFallback: false },
          {
            onToken: (token) => {
              clearTimeout(stepTimer1);
              clearTimeout(stepTimer2);
              accumulatedTokens += token;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.id === assistantMsgId) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: accumulatedTokens },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: assistantMsgId,
                    type: "ai",
                    content: accumulatedTokens,
                    created_at: new Date().toISOString(),
                  },
                ];
              });
            },
            onMessage: (msg: any) => {
              clearTimeout(stepTimer1);
              clearTimeout(stepTimer2);
              setIsLoading(false);
              setCurrentStep("ready");

              const messageText = typeof msg === "string" ? msg : msg.content || "";
              const rawOptions =
                msg.custom_data?.trip_options || msg.additional_kwargs?.trip_options;
              const normalizedOptions = rawOptions
                ? normalizeTripOptions(rawOptions)
                : undefined;
              const suggestions =
                msg.custom_data?.suggestions ||
                msg.additional_kwargs?.suggestions ||
                [];

              if (normalizedOptions) {
                setTripOptions(normalizedOptions);
              }

              if (messageText) {
                accumulatedTokens = messageText;
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  if (last && last.id === assistantMsgId) {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        content: messageText,
                        trip_options: normalizedOptions ?? last.trip_options,
                        tripOptions: normalizedOptions ?? last.tripOptions,
                        suggestions:
                          suggestions.length > 0 ? suggestions : last.suggestions,
                      },
                    ];
                  }
                  return [
                    ...prev,
                    {
                      id: assistantMsgId,
                      type: "ai",
                      role: "assistant",
                      content: messageText,
                      created_at: new Date().toISOString(),
                      trip_options: normalizedOptions,
                      tripOptions: normalizedOptions,
                      suggestions,
                    },
                  ];
                });
              }
            },
            onTripOptions: (options) => {
              const normalized = normalizeTripOptions(options);
              setTripOptions(normalized);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        trip_options: normalized,
                        tripOptions: normalized,
                      }
                    : m
                )
              );
            },
            onSuggestions: (sugs) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        suggestions: sugs,
                      }
                    : m
                )
              );
            },
            onError: (err) => {
              clearTimeout(stepTimer1);
              clearTimeout(stepTimer2);
              setIsLoading(false);
              setCurrentStep("ready");
              setMessages((prev) => [
                ...prev,
                {
                  id: `err-${Date.now()}`,
                  type: "ai",
                  content:
                    typeof err === "string"
                      ? err
                      : err?.message || "Ошибка подключения к сервису путешествий.",
                  created_at: new Date().toISOString(),
                },
              ]);
            },
            onComplete: () => {
              clearTimeout(stepTimer1);
              clearTimeout(stepTimer2);
              setIsLoading(false);
              setCurrentStep("ready");
            },
          },
          abortController.signal
        );
      } catch {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
          setCurrentStep("ready");
        }
      } finally {
        if (!abortController.signal.aborted) {
          clearTimeout(stepTimer1);
          clearTimeout(stepTimer2);
          setIsLoading(false);
        }
      }
    },
    [cancelRequest, isLoading]
  );

  // Select an option to see its full Dossier / Timeline
  const selectOption = useCallback((option: TripOption | null) => {
    setSelectedOption(option);
  }, []);

  // Reset entire dialog
  const resetChat = useCallback(() => {
    cancelRequest();
    threadIdRef.current = null;
    setMessages([]);
    setTripOptions([]);
    setSelectedOption(null);
    setOptimizationDiff(null);
    setIsBookingModalOpen(false);
  }, [cancelRequest]);

  // Load a prompt from history item
  const applyHistoryQuery = useCallback(
    (query: string) => {
      resetChat();
      setTimeout(() => {
        sendMessage(query);
      }, 50);
    },
    [resetChat, sendMessage]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cancelRequest();
    };
  }, [cancelRequest]);

  return {
    messages,
    isLoading,
    currentStep,
    tripOptions,
    selectedOption,
    optimizationDiff,
    isBookingModalOpen,
    sendMessage,
    selectOption,
    resetChat,
    cancelRequest,
    applyHistoryQuery,
    openBookingModal: () => setIsBookingModalOpen(true),
    closeBookingModal: () => setIsBookingModalOpen(false),
  };
}

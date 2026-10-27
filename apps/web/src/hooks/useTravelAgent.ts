import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChatMessage,
  TripOption,
  AgentStepPhase,
} from "../types/travel";
import { PriceOptimizationDiff } from "../components/cards/PriceBreakdown";
import { TravelApiClient } from "@corvax/shared";

export function useTravelAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<AgentStepPhase>("idle");
  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [optimizationDiff, setOptimizationDiff] =
    useState<PriceOptimizationDiff | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const clientRef = useRef(
    new TravelApiClient({
      baseUrl: (import.meta.env.VITE_API_URL as string) || "",
      agentId: (import.meta.env.VITE_AGENT_ID as string) || "travel",
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

      try {
        await clientRef.current.sendMessage(
          text,
          { mockFallback: true },
          {
            onToken: (token) => {
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
            onTripOptions: (options) => {
              setTripOptions(options);
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

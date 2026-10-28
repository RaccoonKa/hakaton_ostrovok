import React, { createContext, useContext, useState, useRef, useCallback } from "react";
import { TripOption, AgentStepPhase, ChatMessage } from "../types/travel";
import { PriceOptimizationDiff } from "../components/cards/PriceBreakdown";
import { TravelApiClient, normalizeTripOptions, UnifiedChatMessage } from "@corvax/shared";

export interface SavedChatSession {
  id: string; // threadId
  title: string;
  timestamp: string; // ISO date
  messages: UnifiedChatMessage[];
  tripOptions: TripOption[];
  selectedOption: TripOption | null;
}

const STORAGE_SESSIONS_KEY = "odin_travel_sessions_v1";

interface ChatContextType {
  messages: UnifiedChatMessage[];
  isLoading: boolean;
  currentStep: AgentStepPhase;
  tripOptions: TripOption[];
  selectedOption: TripOption | null;
  optimizationDiff: PriceOptimizationDiff | null;
  isBookingModalOpen: boolean;
  sessions: SavedChatSession[];
  activeSessionId: string | null;
  sendMessage: (text: string) => Promise<void>;
  selectOption: (opt: TripOption | null) => void;
  startNewChat: () => void;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  openBookingModal: () => void;
  closeBookingModal: () => void;
  cancelRequest: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<SavedChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<AgentStepPhase>("idle");
  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TripOption | null>(null);
  const [optimizationDiff, setOptimizationDiff] = useState<PriceOptimizationDiff | null>(null);
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

  // Sync sessions to localStorage
  const saveSessionsToStorage = (updatedSessions: SavedChatSession[]) => {
    try {
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(updatedSessions));
    } catch {
      // Storage error
    }
  };

  // Persist current chat state into sessions list
  const persistCurrentState = useCallback(
    (
      currentMsgs: UnifiedChatMessage[],
      currentOptions: TripOption[],
      currSelectedOpt: TripOption | null,
      customThreadId?: string
    ) => {
      const activeId = customThreadId || threadIdRef.current;
      if (!activeId || currentMsgs.length === 0) return;

      setSessions((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === activeId);
        const firstUserMsg = currentMsgs.find((m) => m.type === "human" || m.role === "user");
        const title = firstUserMsg
          ? firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? "..." : "")
          : "Маршрут путешествия";

        const updatedSession: SavedChatSession = {
          id: activeId,
          title: existingIdx >= 0 ? prev[existingIdx].title : title,
          timestamp: new Date().toISOString(),
          messages: currentMsgs,
          tripOptions: currentOptions,
          selectedOption: currSelectedOpt,
        };

        let next: SavedChatSession[];
        if (existingIdx >= 0) {
          next = [...prev];
          next[existingIdx] = updatedSession;
        } else {
          next = [updatedSession, ...prev];
        }
        saveSessionsToStorage(next);
        return next;
      });
    },
    []
  );

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setCurrentStep("idle");
  }, []);

  const startNewChat = useCallback(() => {
    cancelRequest();
    threadIdRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
    setTripOptions([]);
    setSelectedOption(null);
    setOptimizationDiff(null);
    setIsBookingModalOpen(false);
  }, [cancelRequest]);

  const selectSession = useCallback(
    (sessionId: string) => {
      cancelRequest();
      const target = sessions.find((s) => s.id === sessionId);
      if (!target) return;

      threadIdRef.current = target.id;
      setActiveSessionId(target.id);
      setMessages(target.messages || []);
      setTripOptions(target.tripOptions || []);
      setSelectedOption(target.selectedOption || null);
      setOptimizationDiff(null);
      setIsBookingModalOpen(false);
    },
    [sessions, cancelRequest]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId);
        saveSessionsToStorage(next);
        return next;
      });
      if (activeSessionId === sessionId) {
        startNewChat();
      }
    },
    [activeSessionId, startNewChat]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      cancelRequest();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);
      setCurrentStep("analyzing_flights");

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: "human",
        content: text,
        created_at: new Date().toISOString(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);

      const assistantMsgId = `ai-${Date.now()}`;
      let accumulatedTokens = "";

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
        setActiveSessionId(threadIdRef.current);
      }
      const currentThreadId = threadIdRef.current;

      try {
        await clientRef.current.sendMessage(
          text,
          { threadId: currentThreadId, mockFallback: false },
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

              let finalOpts = tripOptions;
              if (normalizedOptions) {
                setTripOptions(normalizedOptions);
                finalOpts = normalizedOptions;
              }

              if (messageText) {
                accumulatedTokens = messageText;
                setMessages((prev) => {
                  let updatedList: UnifiedChatMessage[];
                  const last = prev[prev.length - 1];
                  if (last && last.id === assistantMsgId) {
                    updatedList = [
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
                  } else {
                    updatedList = [
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
                  }
                  persistCurrentState(updatedList, finalOpts, selectedOption, currentThreadId);
                  return updatedList;
                });
              }
            },
            onTripOptions: (options) => {
              const normalized = normalizeTripOptions(options);
              setTripOptions(normalized);
              setMessages((prev) => {
                const updated = prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        trip_options: normalized,
                        tripOptions: normalized,
                      }
                    : m
                );
                persistCurrentState(updated, normalized, selectedOption, currentThreadId);
                return updated;
              });
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
              setMessages((prev) => {
                const updated: UnifiedChatMessage[] = [
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
                ];
                persistCurrentState(updated, tripOptions, selectedOption, currentThreadId);
                return updated;
              });
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
    [cancelRequest, isLoading, messages, persistCurrentState, selectedOption, tripOptions]
  );

  const selectOption = useCallback((option: TripOption | null) => {
    setSelectedOption(option);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        currentStep,
        tripOptions,
        selectedOption,
        optimizationDiff,
        isBookingModalOpen,
        sessions,
        activeSessionId,
        sendMessage,
        selectOption,
        startNewChat,
        selectSession,
        deleteSession,
        openBookingModal: () => setIsBookingModalOpen(true),
        closeBookingModal: () => setIsBookingModalOpen(false),
        cancelRequest,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

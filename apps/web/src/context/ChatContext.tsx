import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from "react";
import { TripOption, AgentStepPhase, ChatMessage } from "../types/travel";
import { PriceOptimizationDiff } from "../components/cards/PriceBreakdown";
import { TravelApiClient, normalizeTripOptions, UnifiedChatMessage, formatDisplayTime, ClientAuthManager } from "@corvax/shared";
import { AuthContext } from "./AuthContext";

export interface SavedChatSession {
  id: string; // threadId
  title: string;
  timestamp: string; // ISO date
  messages: UnifiedChatMessage[];
  tripOptions: TripOption[];
  selectedOption: TripOption | null;
}

const STORAGE_SESSIONS_KEY = "odin_travel_sessions_v1";
const getWebSessionsKey = (userId?: string) =>
  userId ? `odin_travel_sessions_${userId}` : "odin_travel_sessions_guest";

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
      const initialUser = ClientAuthManager.getCurrentSession()?.user;
      const key = getWebSessionsKey(initialUser?.id);
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
      const guestStored = localStorage.getItem("odin_travel_sessions_guest");
      if (guestStored) {
        return JSON.parse(guestStored);
      }
      const legacyStored = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (legacyStored) {
        return JSON.parse(legacyStored);
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

  const authCtx = useContext(AuthContext);
  const authToken = authCtx?.token;
  const currentUserId = authCtx?.user?.id;

  const currentUserIdRef = useRef<string | undefined>(currentUserId);
  currentUserIdRef.current = currentUserId;

  // Sync sessions to user-scoped localStorage
  const saveSessionsToStorage = useCallback(
    (updatedSessions: SavedChatSession[], targetUserId?: string) => {
      try {
        const uid = targetUserId !== undefined ? targetUserId : currentUserIdRef.current;
        const key = getWebSessionsKey(uid);
        localStorage.setItem(key, JSON.stringify(updatedSessions));
      } catch {
        // Storage error
      }
    },
    []
  );

  // When user logs in, logs out, or switches accounts:
  const prevUserIdRef = useRef<string | undefined>(currentUserId);
  const isGuestUser = (id?: string) => !id || id.startsWith("guest_");

  useEffect(() => {
    if (prevUserIdRef.current !== currentUserId) {
      const prevUserId = prevUserIdRef.current;
      prevUserIdRef.current = currentUserId;

      const wasGuest = isGuestUser(prevUserId);
      const isNowGuest = isGuestUser(currentUserId);

      // Scenario 1: Guest registers or logs in (Guest -> Registered User)
      if (wasGuest && !isNowGuest && currentUserId) {
        try {
          const userKey = getWebSessionsKey(currentUserId);
          const guestKey = getWebSessionsKey(prevUserId);

          // Get any existing sessions for this registered user
          const existingUserStored = localStorage.getItem(userKey);
          const existingUserSessions: SavedChatSession[] = existingUserStored
            ? JSON.parse(existingUserStored)
            : [];

          // Get guest sessions from current React state or guest storage
          const guestStored =
            localStorage.getItem(guestKey) ||
            localStorage.getItem("odin_travel_sessions_guest");
          const guestSessions: SavedChatSession[] =
            sessions.length > 0
              ? sessions
              : guestStored
              ? JSON.parse(guestStored)
              : [];

          // Merge guest sessions into the user's sessions (guest sessions prioritized)
          const merged = [...guestSessions];
          for (const s of existingUserSessions) {
            if (!merged.some((m) => m.id === s.id)) {
              merged.push(s);
            }
          }
          merged.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          localStorage.setItem(userKey, JSON.stringify(merged));
          setSessions(merged);

          // Clean up old guest storage keys
          if (guestKey) localStorage.removeItem(guestKey);
          localStorage.removeItem("odin_travel_sessions_guest");

          // DO NOT wipe active chat! The current thread was migrated on backend
          // so the user seamlessly continues their chat.
        } catch (e) {
          console.warn("Failed to migrate guest sessions to registered user:", e);
        }
      }
      // Scenario 2: User logs out (Registered User -> Guest)
      else if (!wasGuest && isNowGuest) {
        // Immediately wipe all state so previous user's chats don't leak to the guest
        setMessages([]);
        setTripOptions([]);
        setSelectedOption(null);
        setOptimizationDiff(null);
        setIsBookingModalOpen(false);
        setIsLoading(false);
        threadIdRef.current = null;
        setActiveSessionId(null);
        setSessions([]);

        try {
          // Remove leftover guest sessions
          localStorage.removeItem("odin_travel_sessions_guest");
          if (currentUserId) {
            localStorage.removeItem(getWebSessionsKey(currentUserId));
          }
        } catch {
          // Storage error
        }
      }
      // Scenario 3: Switching between registered accounts or initial load
      else {
        setMessages([]);
        setTripOptions([]);
        setSelectedOption(null);
        setOptimizationDiff(null);
        setIsBookingModalOpen(false);
        setIsLoading(false);
        threadIdRef.current = null;
        setActiveSessionId(null);

        try {
          const key = getWebSessionsKey(currentUserId);
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            setSessions(Array.isArray(parsed) ? parsed : []);
          } else {
            setSessions([]);
          }
        } catch {
          setSessions([]);
        }
      }
    }
  }, [currentUserId, sessions]);

  // Synchronize server threads for the authenticated user & live background polling
  useEffect(() => {
    let isMounted = true;
    const fetchServerThreads = async () => {
      try {
        const data = await clientRef.current.getThreads();
        if (data?.threads && Array.isArray(data.threads) && isMounted) {
          setSessions((prev) => {
            const merged = [...prev];
            for (const t of data.threads) {
              const existingIdx = merged.findIndex((s) => s.id === t.thread_id);
              if (existingIdx < 0) {
                merged.push({
                  id: t.thread_id,
                  title: t.title || "Диалог путешествия",
                  timestamp: t.updated_at || new Date().toISOString(),
                  messages: [],
                  tripOptions: [],
                  selectedOption: null,
                });
              } else {
                if (!merged[existingIdx].title && t.title) {
                  merged[existingIdx].title = t.title;
                }
                if (t.updated_at) {
                  merged[existingIdx].timestamp = t.updated_at;
                }
              }
            }
            merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            saveSessionsToStorage(merged);
            return merged;
          });

          // If active thread is open, sync any new messages from server (e.g. sent from mobile)
          const activeId = threadIdRef.current;
          if (activeId && !isLoading) {
            try {
              const hist = await clientRef.current.getHistory(activeId);
              if (hist?.messages && Array.isArray(hist.messages) && isMounted) {
                setMessages((current) => {
                  if (hist.messages.length > current.length) {
                    let extractedOptions: TripOption[] = tripOptions;
                    const mapped = hist.messages.map((m: any, idx: number) => {
                      const rawOpts = m.custom_data?.trip_options || m.additional_kwargs?.trip_options;
                      if (rawOpts && Array.isArray(rawOpts) && rawOpts.length > 0) {
                        extractedOptions = normalizeTripOptions(rawOpts);
                      }
                      return {
                        id: m.run_id || `srv_${activeId}_${idx}`,
                        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
                        type: m.type === "human" ? "human" : "ai",
                        role: m.type === "human" ? "user" : "assistant",
                        timestamp: formatDisplayTime(m.created_at || m.timestamp) || new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
                        trip_options: extractedOptions.length > 0 ? extractedOptions : undefined,
                        tripOptions: extractedOptions.length > 0 ? extractedOptions : undefined,
                      };
                    });
                    setTripOptions(extractedOptions);
                    return mapped;
                  }
                  return current;
                });
              }
            } catch {
              // offline safe
            }
          }
        }
      } catch {
        // Fallback safely if unauthenticated or server offline
      }
    };

    fetchServerThreads();
    const handleStorageChange = () => fetchServerThreads();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", fetchServerThreads);
    const pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchServerThreads();
      }
    }, 3500);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", fetchServerThreads);
      clearInterval(pollTimer);
    };
  }, [authToken, currentUserId, saveSessionsToStorage, isLoading, tripOptions]);

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

        const remaining = prev.filter((s) => s.id !== activeId);
        const next = [updatedSession, ...remaining];
        saveSessionsToStorage(next);
        return next;
      });
    },
    [saveSessionsToStorage]
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
    async (sessionId: string) => {
      cancelRequest();
      const target = sessions.find((s) => s.id === sessionId);
      if (!target) return;

      threadIdRef.current = target.id;
      setActiveSessionId(target.id);
      setOptimizationDiff(null);
      setIsBookingModalOpen(false);

      // Display cached messages immediately
      if (target.messages && target.messages.length > 0) {
        setMessages(target.messages);
        setTripOptions(target.tripOptions || []);
        setSelectedOption(target.selectedOption || null);
      }

      // Always fetch latest server history to pick up any new turns sent from mobile
      try {
        const history = await clientRef.current.getHistory(target.id);
        if (history?.messages && Array.isArray(history.messages) && history.messages.length > 0) {
          let extractedOptions: TripOption[] = target.tripOptions || [];
          const mapped: UnifiedChatMessage[] = history.messages.map((m: any, idx: number) => {
            const rawOpts = m.custom_data?.trip_options || m.additional_kwargs?.trip_options;
            if (rawOpts && Array.isArray(rawOpts) && rawOpts.length > 0) {
              extractedOptions = normalizeTripOptions(rawOpts);
            }
            return {
              id: m.run_id || `srv_${target.id}_${idx}`,
              content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
              type: m.type === "human" ? "human" : "ai",
              role: m.type === "human" ? "user" : "assistant",
              timestamp: formatDisplayTime(m.created_at || m.timestamp) || new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
              trip_options: extractedOptions.length > 0 ? extractedOptions : undefined,
              tripOptions: extractedOptions.length > 0 ? extractedOptions : undefined,
            };
          });
          setMessages(mapped);
          setTripOptions(extractedOptions);
          setSelectedOption(target.selectedOption || null);
          setSessions((prev) => {
            const updated = prev.map((s) => (s.id === target.id ? { ...s, messages: mapped, tripOptions: extractedOptions } : s));
            saveSessionsToStorage(updated);
            return updated;
          });
        } else if (!target.messages || target.messages.length === 0) {
          setMessages([]);
        }
      } catch (e) {
        console.warn("Failed to load server thread messages:", e);
        if (!target.messages || target.messages.length === 0) {
          setMessages([]);
        }
      }
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
              setMessages((latest) => {
                persistCurrentState(latest, tripOptions, selectedOption, currentThreadId);
                return latest;
              });
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

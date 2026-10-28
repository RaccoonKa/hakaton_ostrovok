import { useState, useCallback, useRef, useEffect } from "react";
import { NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  TripOption,
  TravelApiClient,
  normalizeTripOptions,
  UnifiedChatMessage,
  AuthSession,
  ClientAuthManager,
  formatDisplayTime,
} from "@corvax/shared";
import { MobileChatMessage } from "../types";

export interface HistorySessionRecord {
  id: string;
  query: string;
  timestamp: string;
}

export interface SavedMobileSession {
  id: string;
  title: string;
  timestamp: string;
  messages: UnifiedChatMessage[];
  tripOptions: TripOption[];
  selectedOption: TripOption | null;
}

export interface UseMobileAgentOptions {
  baseUrl?: string;
  authSession?: AuthSession | null;
}

declare const process: any;

const STORAGE_SESSIONS_KEY = "odin_mobile_sessions_v1";
const getMobileSessionsKey = (userId?: string) =>
  userId ? `odin_mobile_sessions_${userId}` : "odin_mobile_sessions_guest";

const memoryStorage = new Map<string, string>();

async function safeStorageGet(key: string): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val !== null && val !== undefined) return val;
    return memoryStorage.get(key) ?? null;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

async function safeStorageSet(key: string, value: string): Promise<void> {
  memoryStorage.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // In-memory fallback is active
  }
}

export function getDefaultBackendUrl(): string {
  if (typeof process !== "undefined" && process?.env?.EXPO_PUBLIC_BACKEND_URL) {
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = String(scriptURL).match(/^https?:\/\/([^/:]+)/);
    if (match && match[1]) {
      const host = match[1];
      if (host.includes("exp.direct") || host.includes("ngrok")) {
        return "https://strong-colts-own.loca.lt";
      }
      return `http://${host}:8080`;
    }
  }
  return "https://strong-colts-own.loca.lt";
}

export function useMobileAgent(options: UseMobileAgentOptions = {}) {
  const [messages, setMessages] = useState<UnifiedChatMessage[]>([]);
  const [historySessions, setHistorySessions] = useState<HistorySessionRecord[]>([]);
  const [savedSessions, setSavedSessions] = useState<SavedMobileSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

  const cancelRequest = useCallback(() => {
    clearTimers();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsThinking(false);
    setIsStreaming(false);
  }, [clearTimers]);

  const resetChat = useCallback(() => {
    cancelRequest();
    threadIdRef.current = null;
    setActiveSessionId(null);
    setMessages([]);
    setTripOptions([]);
    setSelectedOption(null);
    setIsThinking(false);
    setIsStreaming(false);
    setConfirmedBookingId(null);
  }, [cancelRequest]);

  const currentUserId = options.authSession?.user?.id;
  const prevUserIdRef = useRef<string | undefined>(currentUserId);

  // When user logs in, logs out, or switches accounts: immediately wipe state & load that user's threads
  useEffect(() => {
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId;
      resetChat();
      setSavedSessions([]);
    }
  }, [currentUserId, resetChat]);

  // Load saved sessions from persistent storage and sync with server
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storageKey = getMobileSessionsKey(currentUserId);
        const stored = await safeStorageGet(storageKey);
        let currentList: SavedMobileSession[] = [];
        if (stored && isMounted) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentList = parsed;
            setSavedSessions(parsed);
          } else {
            setSavedSessions([]);
          }
        } else if (isMounted) {
          setSavedSessions([]);
        }

        // Fetch server threads for authenticated user
        await ClientAuthManager.ensureAuthToken(backendUrl);
        const data = await clientRef.current.getThreads();
        if (data?.threads && Array.isArray(data.threads) && isMounted) {
          const merged = [...currentList];
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
            } else if (!merged[existingIdx].title && t.title) {
              merged[existingIdx].title = t.title;
            }
          }
          merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setSavedSessions(merged);
          await safeStorageSet(storageKey, JSON.stringify(merged));
        }
      } catch {
        // Fallback safely handled
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [backendUrl, options.authSession?.token, currentUserId]);

  const saveSessionsToStorage = async (list: SavedMobileSession[]) => {
    try {
      const storageKey = getMobileSessionsKey(currentUserId);
      await safeStorageSet(storageKey, JSON.stringify(list));
    } catch {
      // Fallback safely handled
    }
  };



  const formatCurrentTime = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const persistSession = useCallback(
    (
      msgs: UnifiedChatMessage[],
      options: TripOption[],
      selectedOpt: TripOption | null,
      customId?: string
    ) => {
      const activeId = customId || threadIdRef.current;
      if (!activeId || msgs.length === 0) return;

      const firstUserMsg = msgs.find((m) => m.role === "user" || (m as any).type === "human");
      const title = firstUserMsg
        ? firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? "..." : "")
        : "Маршрут путешествия";

      setSavedSessions((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === activeId);
        const updated: SavedMobileSession = {
          id: activeId,
          title: existingIdx >= 0 ? prev[existingIdx].title : title,
          timestamp: formatCurrentTime(),
          messages: msgs,
          tripOptions: options,
          selectedOption: selectedOpt,
        };
        const remaining = prev.filter((s) => s.id !== activeId);
        const next = [updated, ...remaining];
        saveSessionsToStorage(next);
        return next;
      });
    },
    []
  );



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

      if (!threadIdRef.current) {
        threadIdRef.current = `mobile-session-${Date.now()}`;
        setActiveSessionId(threadIdRef.current);
      }
      const currentThreadId = threadIdRef.current;

      setMessages((prev) => {
        const next = [...prev, userMsg];
        persistSession(next, tripOptions, selectedOption, currentThreadId);
        return next;
      });
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
        }
      }, 700);

      timer2Ref.current = setTimeout(() => {
        if (!abortController.signal.aborted) {
          setThinkingText("Рассчитываю бюджет и оптимизацию...");
        }
      }, 1500);

      let accumulatedContent = "";

      try {
        await clientRef.current.sendMessage(
          trimmed,
          { threadId: threadIdRef.current, mockFallback: false },
          {
            onToken: (token: string) => {
              clearTimers();
              accumulatedContent += token;
              setIsThinking(false);
              setIsStreaming(false);
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.id === assistantMsgId) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: accumulatedContent },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: assistantMsgId,
                    role: "assistant",
                    type: "ai",
                    content: accumulatedContent,
                    timestamp: timeStr,
                  },
                ];
              });
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
                setMessages((prev) => {
                  const last = prev[prev.length - 1];
                  let next: UnifiedChatMessage[];
                  if (last && last.id === assistantMsgId) {
                    next = [
                      ...prev.slice(0, -1),
                      {
                        ...last,
                        content,
                        trip_options: normalized ?? last.trip_options,
                        tripOptions: normalized ?? last.tripOptions,
                        suggestions:
                          suggestions.length > 0 ? suggestions : last.suggestions,
                      },
                    ];
                  } else {
                    next = [
                      ...prev,
                      {
                        id: assistantMsgId,
                        role: "assistant",
                        type: "ai",
                        content,
                        timestamp: timeStr,
                        trip_options: normalized,
                        tripOptions: normalized,
                        suggestions,
                      },
                    ];
                  }
                  persistSession(next, normalized || tripOptions, selectedOption, currentThreadId);
                  return next;
                });
              }
            },
            onTripOptions: (options: TripOption[]) => {
              clearTimers();
              setIsThinking(false);
              setIsStreaming(false);
              const normalized = normalizeTripOptions(options);
              setTripOptions(normalized);
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.id === assistantMsgId) {
                  const updated = prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, trip_options: normalized, tripOptions: normalized }
                      : m
                  );
                  persistSession(updated, normalized, selectedOption, currentThreadId);
                  return updated;
                }
                const next: UnifiedChatMessage[] = [
                  ...prev,
                  {
                    id: assistantMsgId,
                    role: "assistant",
                    type: "ai",
                    content:
                      accumulatedContent ||
                      "По вашему запросу сформированы следующие варианты:",
                    timestamp: timeStr,
                    trip_options: normalized,
                    tripOptions: normalized,
                  },
                ];
                persistSession(next, normalized, selectedOption, currentThreadId);
                return next;
              });
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
              setMessages((latest) => {
                persistSession(latest, tripOptions, selectedOption, currentThreadId);
                return latest;
              });
            },
            onError: (err) => {
              clearTimers();
              console.warn("Client message error:", err);
              setIsThinking(false);
              setIsStreaming(false);
              const errMsg = typeof err === "string" ? err : (err as any)?.message || "";
              if (errMsg.includes("404")) {
                threadIdRef.current = null;
                setActiveSessionId(null);
              }
              setMessages((prev) => [
                ...prev,
                {
                  id: assistantMsgId,
                  role: "assistant",
                  type: "ai",
                  content:
                    typeof err === "string"
                      ? err
                      : (err as any)?.message ||
                        "Сервис временно недоступен. Пожалуйста, проверьте соединение с сервером.",
                  timestamp: timeStr,
                },
              ]);
            },
          },
          abortController.signal
        );
      } catch (err) {
        clearTimers();
        console.warn("Error sending message:", err);
        setIsThinking(false);
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            type: "ai",
            content:
              accumulatedContent ||
              "Ошибка подключения к сервису. Попробуйте повторить запрос позже.",
            timestamp: timeStr,
          },
        ]);
      }
    },
    [cancelRequest, clearTimers, isThinking]
  );

  const selectOption = useCallback(
    (option: TripOption | null) => {
      setSelectedOption(option);
      if (threadIdRef.current && messages.length > 0) {
        persistSession(messages, tripOptions, option, threadIdRef.current);
      }
    },
    [messages, persistSession, tripOptions]
  );

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

  const selectSession = useCallback(
    async (session: SavedMobileSession) => {
      cancelRequest();
      threadIdRef.current = session.id;
      setActiveSessionId(session.id);
      setIsThinking(false);
      setIsStreaming(false);

      const hasBothUserAndAI = session.messages && session.messages.length > 1;
      if (hasBothUserAndAI) {
        setMessages(session.messages);
        setTripOptions(session.tripOptions || []);
        setSelectedOption(session.selectedOption || null);
      } else {
        // Fetch server history (for cross-client sync or missing AI responses)
        try {
          const history = await clientRef.current.getHistory(session.id);
          if (history?.messages && Array.isArray(history.messages) && history.messages.length > 0) {
            let extractedOptions: TripOption[] = session.tripOptions || [];
            const mapped: MobileChatMessage[] = history.messages.map((m: any, idx: number) => {
              const rawOpts = m.custom_data?.trip_options || m.additional_kwargs?.trip_options;
              if (rawOpts && Array.isArray(rawOpts) && rawOpts.length > 0) {
                extractedOptions = normalizeTripOptions(rawOpts);
              }
              return {
                id: m.run_id || `srv_${session.id}_${idx}`,
                content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
                role: m.type === "human" ? "user" : "assistant",
                timestamp: formatDisplayTime(m.created_at || m.timestamp) || formatCurrentTime(),
                trip_options: extractedOptions.length > 0 ? extractedOptions : undefined,
                tripOptions: extractedOptions.length > 0 ? extractedOptions : undefined,
              };
            });
            setMessages(mapped);
            setTripOptions(extractedOptions);
            setSelectedOption(session.selectedOption || null);
            setSavedSessions((prev) => {
              const updated = prev.map((s) => (s.id === session.id ? { ...s, messages: mapped, tripOptions: extractedOptions } : s));
              safeStorageSet(getMobileSessionsKey(currentUserId), JSON.stringify(updated));
              return updated;
            });
          } else if (session.messages && session.messages.length > 0) {
            setMessages(session.messages);
            setTripOptions(session.tripOptions || []);
            setSelectedOption(session.selectedOption || null);
          } else {
            setMessages([]);
          }
        } catch {
          setMessages(session.messages || []);
        }
      }
    },
    [cancelRequest]
  );



  const deleteSession = useCallback(
    (sessionId: string) => {
      setSavedSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId);
        saveSessionsToStorage(next);
        return next;
      });
      if (activeSessionId === sessionId) {
        resetChat();
      }
    },
    [activeSessionId, resetChat]
  );

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
    savedSessions,
    activeSessionId,
    backendUrl,
    setBackendUrl,
    sendMessage,
    selectOption,
    selectSession,
    deleteSession,
    openCheckout,
    closeCheckout,
    handleBookingConfirmed,
    resetChat,
  };
}

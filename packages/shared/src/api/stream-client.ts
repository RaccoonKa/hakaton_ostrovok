import { ChatMessage } from "../domain/types";
import { normalizeTripOptions } from "../domain/normalize";
import { ClientCallbacks } from "./types";
import { ClientAuthManager } from "./auth-client";

/**
 * Клиент для нативного потокового эндпоинта FastAPI:
 * POST /{agent_id}/stream
 * Принимает сообщения типа `data: {"type": "token"|"message"|"error", "content": ...}`
 */
export class FastApiStreamClient {
  private baseUrl: string;
  private authSecret?: string | (() => string | null | Promise<string | null>);

  constructor(
    options: {
      baseUrl?: string;
      authSecret?: string | (() => string | null | Promise<string | null>);
    } = {}
  ) {
    this.baseUrl = options.baseUrl || "";
    this.authSecret = options.authSecret;
  }

  private async getAuthToken(): Promise<string | null> {
    if (typeof this.authSecret === "function") {
      try {
        const res = await this.authSecret();
        if (res) return res;
      } catch {
        // fallback
      }
    } else if (this.authSecret) {
      return this.authSecret;
    }

    const session = ClientAuthManager.getCurrentSession();
    if (session?.token) {
      return session.token;
    }

    // Авто-получение гостевого токена при отсутствии
    try {
      return await ClientAuthManager.ensureAuthToken(this.baseUrl);
    } catch {
      return null;
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "bypass-tunnel-reminder": "true",
      "Bypass-Tunnel-Reminder": "true",
    };

    const token = await this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async streamAgent(
    agentId: string,
    message: string,
    options: {
      threadId?: string;
      userId?: string;
      model?: string;
      streamTokens?: boolean;
    } = {},
    callbacks: ClientCallbacks,
    signal?: AbortSignal,
    isRetry = false
  ): Promise<void> {
    const url = `${this.baseUrl}/${agentId}/stream`;
    const payload = {
      message,
      thread_id: options.threadId,
      user_id: options.userId,
      model: options.model,
      stream_tokens: options.streamTokens ?? true,
    };

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      controller.abort(
        new Error("Время ожидания ответа агента истекло (120 секунд). Попробуйте повторить запрос.")
      );
    }, 120000);

    const resetTimeout = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          controller.abort(
            new Error("Превышено время ожидания между чанками ответа (120 секунд).")
          );
        }, 120000);
      }
    };

    const onExternalAbort = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      controller.abort();
    };
    signal?.addEventListener("abort", onExternalAbort);

    try {
      const headers = await this.getHeaders();
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.status === 401 && !isRetry) {
        // Токен устарел или отклонён сервером — пробуем перевыпустить гостевую сессию и повторить
        ClientAuthManager.saveCurrentSession(null);
        await ClientAuthManager.ensureAuthToken(this.baseUrl);
        return this.streamAgent(agentId, message, options, callbacks, signal, true);
      }

      if (!response.ok) {
        throw new Error(`Stream request failed with status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        resetTimeout();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const trimmed = block.trim();
          if (!trimmed) continue;

          for (const line of trimmed.split("\n")) {
            if (line.startsWith("data:")) {
              const dataStr = line.slice(5).trim();
              if (dataStr === "[DONE]") {
                callbacks.onComplete?.();
                return;
              }

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === "token" && typeof parsed.content === "string") {
                  callbacks.onToken?.(parsed.content);
                } else if (parsed.type === "message" && parsed.content) {
                  const msg = parsed.content as ChatMessage;
                  callbacks.onMessage?.(msg);

                  if (msg.custom_data?.trip_options) {
                    callbacks.onTripOptions?.(normalizeTripOptions(msg.custom_data.trip_options));
                  } else if (
                    msg.type === "ai" &&
                    (msg as any).custom_payload?.packaged_trip_options
                  ) {
                    callbacks.onTripOptions?.(
                      normalizeTripOptions((msg as any).custom_payload.packaged_trip_options)
                    );
                  }

                  if (
                    Array.isArray(msg.custom_data?.suggestions) &&
                    msg.custom_data.suggestions.length > 0
                  ) {
                    callbacks.onSuggestions?.(msg.custom_data.suggestions);
                  }
                } else if (parsed.type === "error") {
                  callbacks.onError?.(new Error(parsed.content || "Agent error"));
                }
              } catch {
                // If line wasn't JSON, send raw token if looks like text
                callbacks.onToken?.(dataStr);
              }
            }
          }
        }
      }

      callbacks.onComplete?.();
    } catch (err: unknown) {
      if (signal?.aborted) return;
      if (controller.signal.aborted && controller.signal.reason instanceof Error) {
        throw controller.signal.reason;
      }
      throw err;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      signal?.removeEventListener("abort", onExternalAbort);
    }
  }
}

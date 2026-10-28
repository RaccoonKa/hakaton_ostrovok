import { ChatMessage } from "../domain/types";
import { normalizeTripOptions } from "../domain/normalize";
import { ClientCallbacks } from "./types";

/**
 * Клиент для нативного потокового эндпоинта FastAPI:
 * POST /{agent_id}/stream
 * Принимает сообщения типа `data: {"type": "token"|"message"|"error", "content": ...}`
 */
export class FastApiStreamClient {
  private baseUrl: string;
  private authSecret?: string;

  constructor(options: { baseUrl?: string; authSecret?: string } = {}) {
    this.baseUrl = options.baseUrl || "";
    this.authSecret = options.authSecret;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "bypass-tunnel-reminder": "true",
      "Bypass-Tunnel-Reminder": "true",
    };
    if (this.authSecret) {
      headers["Authorization"] = `Bearer ${this.authSecret}`;
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
    signal?: AbortSignal
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
          controller.abort(new Error("Поток данных от агента прерван по таймауту неактивности."));
        }, 60000);
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
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

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
                switch (parsed.type) {
                  case "token":
                    callbacks.onToken?.(parsed.content);
                    break;
                  case "message": {
                    const msg = parsed.content as ChatMessage;
                    callbacks.onMessage?.(msg);
                    if (msg.custom_data?.trip_options) {
                      callbacks.onTripOptions?.(normalizeTripOptions(msg.custom_data.trip_options));
                    }
                    if (Array.isArray(msg.custom_data?.suggestions) && msg.custom_data.suggestions.length > 0) {
                      callbacks.onSuggestions?.(msg.custom_data.suggestions);
                    }
                    break;
                  }
                  case "error":
                    callbacks.onError?.(new Error(parsed.content || "Internal stream error"));
                    break;
                }
              } catch {
                callbacks.onToken?.(dataStr);
              }
            }
          }
        }
      }

      callbacks.onComplete?.();
    } catch (err: unknown) {
      if (signal?.aborted) {
        return;
      }
      if (controller.signal.aborted && controller.signal.reason instanceof Error) {
        throw controller.signal.reason;
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onExternalAbort);
    }
  }
}

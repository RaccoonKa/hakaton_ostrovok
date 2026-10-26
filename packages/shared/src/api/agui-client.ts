import { AgUiEvent, ClientCallbacks, RunAgentInput } from "./types";

/**
 * Клиент для протокола AG-UI (Agent UI), подключающийся к эндпоинту
 * POST /agui/{agent_id}/run
 */
export class AgUiClient {
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
    };
    if (this.authSecret) {
      headers["Authorization"] = `Bearer ${this.authSecret}`;
    }
    return headers;
  }

  /**
   * Запускает агента и парсит поток SSE событий AG-UI.
   */
  async runAgent(
    agentId: string,
    input: RunAgentInput,
    callbacks: ClientCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const url = `${this.baseUrl}/agui/${agentId}/run`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(input),
        signal,
      });

      if (!response.ok) {
        throw new Error(`AG-UI request failed with status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream is not supported or response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

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
                const event: AgUiEvent = JSON.parse(dataStr);
                this.handleAgUiEvent(event, callbacks);
              } catch (e) {
                // Если пришла просто строка или невалидный JSON
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
      callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private handleAgUiEvent(event: AgUiEvent, callbacks: ClientCallbacks): void {
    switch (event.type) {
      case "TEXT_MESSAGE_CHUNK":
        if (typeof event.content === "string") {
          callbacks.onToken?.(event.content);
        } else if (typeof event.data === "string") {
          callbacks.onToken?.(event.data);
        }
        break;
      case "STATE_UPDATE":
        if (event.state && typeof event.state === "object") {
          const tripOptions = (event.state as Record<string, unknown>).trip_options;
          if (Array.isArray(tripOptions)) {
            callbacks.onTripOptions?.(tripOptions);
          }
        }
        break;
      case "ERROR":
        callbacks.onError?.(new Error(String(event.content || event.data || "Unknown AG-UI error")));
        break;
      default:
        // Другие типы событий (RUN_START, RUN_END и т.д.)
        break;
    }
  }
}

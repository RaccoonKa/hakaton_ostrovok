import { ServiceMetadata } from "../domain/types";
import { MOCK_TRIP_OPTIONS } from "../mocks/travel-options";
import { AgUiClient } from "./agui-client";
import { FastApiStreamClient } from "./stream-client";
import { AgentClientConfig, ClientCallbacks } from "./types";

export class TravelApiClient {
  private baseUrl: string;
  private agentId: string;
  private authSecret?: string;
  private useAgUi: boolean;
  private agUiClient: AgUiClient;
  private streamClient: FastApiStreamClient;

  constructor(config: AgentClientConfig = {}) {
    this.baseUrl = config.baseUrl || "";
    // Harmonized default: backend registers 'travel_agent'. Also normalize legacy 'travel' -> 'travel_agent'
    const rawAgent = config.agentId || "travel_agent";
    this.agentId = rawAgent === "travel" ? "travel_agent" : rawAgent;
    this.authSecret = config.authSecret;
    this.useAgUi = config.useAgUi ?? false;

    this.agUiClient = new AgUiClient({
      baseUrl: this.baseUrl,
      authSecret: this.authSecret,
    });
    this.streamClient = new FastApiStreamClient({
      baseUrl: this.baseUrl,
      authSecret: this.authSecret,
    });
  }

  /**
   * Проверяет доступность бэкенда.
   */
  async checkHealth(): Promise<{ status: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  }

  /**
   * Получает метаданные сервиса (список агентов, моделей).
   */
  async getInfo(): Promise<ServiceMetadata> {
    const headers: Record<string, string> = {};
    if (this.authSecret) {
      headers["Authorization"] = `Bearer ${this.authSecret}`;
    }
    const res = await fetch(`${this.baseUrl}/info`, { headers });
    if (!res.ok) throw new Error(`Get info failed: ${res.status}`);
    return res.json();
  }

  /**
   * Отправляет сообщение в диалог с потоковым получением ответа.
   * Если бэкенд недоступен или запрос отклонён, автоматически
   * предлагает демонстрационный сценарий с флагом isDemo.
   */
  async sendMessage(
    message: string,
    options: {
      threadId?: string;
      userId?: string;
      mockFallback?: boolean;
    } = {},
    callbacks: ClientCallbacks,
    signal?: AbortSignal
  ): Promise<void> {
    const mockFallback = options.mockFallback ?? true;

    try {
      if (this.useAgUi) {
        await this.agUiClient.runAgent(
          this.agentId,
          {
            thread_id: options.threadId,
            messages: [{ role: "user", content: message }],
            forwarded_props: {
              configurable: {
                user_id: options.userId,
              },
            },
          },
          callbacks,
          signal
        );
      } else {
        await this.streamClient.streamAgent(
          this.agentId,
          message,
          {
            threadId: options.threadId,
            userId: options.userId,
          },
          callbacks,
          signal
        );
      }
    } catch (err: unknown) {
      if (signal?.aborted) return;

      if (mockFallback) {
        console.warn(
          "Backend unavailable or graph not yet initialized. Falling back to Demo Mode.",
          err
        );
        await this.runMockResponse(message, callbacks);
      } else {
        callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /**
   * Имитирует потоковый ответ демонстрационного сценария.
   */
  private runMockResponse(userMessage: string, callbacks: ClientCallbacks): Promise<void> {
    return new Promise((resolve) => {
      const demoResponseText =
        "Отличный выбор! Я проанализировал лучшие направления для отдыха. " +
        "Ниже представлены оптимальные варианты перелёта и проживания с детальным расчётом бюджета. " +
        "Вы можете скорректировать даты, бюджет или выбрать конкретный отель.";

      const words = demoResponseText.split(" ");
      let index = 0;

      const interval = setInterval(() => {
        if (index < words.length) {
          callbacks.onToken?.((index === 0 ? "" : " ") + words[index]);
          index++;
        } else {
          clearInterval(interval);
          // Отправляем карточки с пометкой [Демо]
          callbacks.onTripOptions?.(MOCK_TRIP_OPTIONS);
          callbacks.onComplete?.();
          resolve();
        }
      }, 30);
    });
  }
}

export { TravelApiClient as TravelAgentClient };

import { ChatMessage, TripOption } from "../domain/types";

export enum AgUiEventType {
  RUN_START = "RUN_START",
  RUN_END = "RUN_END",
  STEP_START = "STEP_START",
  STEP_END = "STEP_END",
  TEXT_MESSAGE_START = "TEXT_MESSAGE_START",
  TEXT_MESSAGE_CHUNK = "TEXT_MESSAGE_CHUNK",
  TEXT_MESSAGE_END = "TEXT_MESSAGE_END",
  TOOL_CALL_START = "TOOL_CALL_START",
  TOOL_CALL_CHUNK = "TOOL_CALL_CHUNK",
  TOOL_CALL_END = "TOOL_CALL_END",
  STATE_UPDATE = "STATE_UPDATE",
  CUSTOM = "CUSTOM",
  ERROR = "ERROR",
  RAW = "RAW",
}

export interface AgUiEvent {
  type: AgUiEventType | string;
  data?: unknown;
  content?: string;
  run_id?: string;
  step_id?: string;
  message_id?: string;
  state?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RunAgentInput {
  thread_id?: string;
  run_id?: string;
  messages?: Array<{ role: string; content: string }>;
  forwarded_props?: {
    configurable?: {
      model?: string;
      user_id?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  input?: Record<string, unknown>;
}

export interface StreamEvent {
  type: "token" | "message" | "error" | "done";
  content?: string | ChatMessage;
}

export interface ClientCallbacks {
  onToken?: (token: string) => void;
  onMessage?: (message: ChatMessage) => void;
  onTripOptions?: (options: TripOption[]) => void;
  onSuggestions?: (suggestions: string[]) => void;
  onError?: (error: Error | string) => void;
  onComplete?: () => void;
}

export interface AgentClientConfig {
  baseUrl?: string;
  agentId?: string;
  authSecret?: string;
  useAgUi?: boolean;
}

import type { AlertItem, Severity } from "./alert";

export type ScorePayload = {
  code_health_score: number;
  alert_count: Record<Severity, number>;
};

export type DonePayload = {
  status: "completed";
  analysis_id: string;
  duration_ms: number;
};

/** Typed SSE error codes from backend C05 / docs/spec.md §5. */
export type SseErrorCode =
  | "LLM_TIMEOUT"
  | "LLM_UNAVAILABLE"
  | "LLM_SCHEMA"
  | "RATE_LIMITED";

export type ErrorPayload = {
  error: SseErrorCode;
  message: string;
  analysis_id: string;
};

export type SseEvent =
  | { event: "alert"; data: AlertItem }
  | { event: "score"; data: ScorePayload }
  | { event: "done"; data: DonePayload }
  | { event: "error"; data: ErrorPayload };

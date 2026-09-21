import type { AlertItem, Category, Severity } from "@/types/alert";
import type {
  DonePayload,
  ErrorPayload,
  ScorePayload,
  SseErrorCode,
  SseEvent,
} from "@/types/analysis";

export const INVALID_ALERT_TOAST = "Alerta ignorado: formato inválido";

export type ParseOk<T> = { ok: true; value: T };
export type ParseFail = { ok: false };
export type ParseResult<T> = ParseOk<T> | ParseFail;

const SEVERITIES: ReadonlySet<string> = new Set([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

const CATEGORIES: ReadonlySet<string> = new Set([
  "SECURITY",
  "PERFORMANCE",
  "QUALITY",
  "MAINTAINABILITY",
]);

/** UUID v4 (RFC 4122): version nibble 4, variant 8|9|a|b. */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && SEVERITIES.has(value);
}

function isCategory(value: unknown): value is Category {
  return typeof value === "string" && CATEGORIES.has(value);
}

/** Pure RF02 guard — no React, no fetch, no api-paths. */
export function parseAlertItem(raw: unknown): ParseResult<AlertItem> {
  if (!isRecord(raw)) {
    return { ok: false };
  }

  const {
    id,
    file,
    line_start,
    line_end,
    severity,
    title,
    description,
    suggestion,
    category,
  } = raw;

  if (typeof id !== "string" || !UUID_V4.test(id)) {
    return { ok: false };
  }
  if (typeof file !== "string") {
    return { ok: false };
  }
  if (typeof line_start !== "number" || !Number.isInteger(line_start)) {
    return { ok: false };
  }
  if (typeof line_end !== "number" || !Number.isInteger(line_end)) {
    return { ok: false };
  }
  if (line_end < line_start) {
    return { ok: false };
  }
  if (!isSeverity(severity)) {
    return { ok: false };
  }
  if (typeof title !== "string") {
    return { ok: false };
  }
  if (typeof description !== "string") {
    return { ok: false };
  }
  if (typeof suggestion !== "string") {
    return { ok: false };
  }
  if (!isCategory(category)) {
    return { ok: false };
  }

  return {
    ok: true,
    value: {
      id,
      file,
      line_start,
      line_end,
      severity,
      title,
      description,
      suggestion,
      category,
    },
  };
}

function parseScorePayload(raw: unknown): ParseResult<ScorePayload> {
  if (!isRecord(raw)) {
    return { ok: false };
  }
  const { code_health_score, alert_count } = raw;
  if (typeof code_health_score !== "number" || !Number.isFinite(code_health_score)) {
    return { ok: false };
  }
  if (!isRecord(alert_count)) {
    return { ok: false };
  }
  const counts: ScorePayload["alert_count"] = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };
  for (const sev of SEVERITIES) {
    const n = alert_count[sev];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
      return { ok: false };
    }
    counts[sev as Severity] = n;
  }
  return {
    ok: true,
    value: { code_health_score, alert_count: counts },
  };
}

const SSE_ERROR_CODES: ReadonlySet<string> = new Set([
  "LLM_TIMEOUT",
  "LLM_UNAVAILABLE",
  "LLM_SCHEMA",
  "RATE_LIMITED",
]);

function parseDonePayload(raw: unknown): ParseResult<DonePayload> {
  if (!isRecord(raw)) {
    return { ok: false };
  }
  const { status, analysis_id, duration_ms } = raw;
  if (status !== "completed") {
    return { ok: false };
  }
  if (typeof analysis_id !== "string" || analysis_id.length === 0) {
    return { ok: false };
  }
  if (typeof duration_ms !== "number" || !Number.isFinite(duration_ms)) {
    return { ok: false };
  }
  return {
    ok: true,
    value: { status: "completed", analysis_id, duration_ms },
  };
}

function parseErrorPayload(raw: unknown): ParseResult<ErrorPayload> {
  if (!isRecord(raw)) {
    return { ok: false };
  }
  const { error, message, analysis_id } = raw;
  if (typeof error !== "string" || !SSE_ERROR_CODES.has(error)) {
    return { ok: false };
  }
  if (typeof message !== "string" || message.length === 0) {
    return { ok: false };
  }
  if (typeof analysis_id !== "string" || analysis_id.length === 0) {
    return { ok: false };
  }
  return {
    ok: true,
    value: {
      error: error as SseErrorCode,
      message,
      analysis_id,
    },
  };
}

/** Pure SSE event guard for alert | score | done | error. */
export function parseSseEvent(raw: unknown): ParseResult<SseEvent> {
  if (!isRecord(raw)) {
    return { ok: false };
  }
  const { event, data } = raw;
  if (event === "alert") {
    const alert = parseAlertItem(data);
    if (!alert.ok) {
      return { ok: false };
    }
    return { ok: true, value: { event: "alert", data: alert.value } };
  }
  if (event === "score") {
    const score = parseScorePayload(data);
    if (!score.ok) {
      return { ok: false };
    }
    return { ok: true, value: { event: "score", data: score.value } };
  }
  if (event === "done") {
    const done = parseDonePayload(data);
    if (!done.ok) {
      return { ok: false };
    }
    return { ok: true, value: { event: "done", data: done.value } };
  }
  if (event === "error") {
    const err = parseErrorPayload(data);
    if (!err.ok) {
      return { ok: false };
    }
    return { ok: true, value: { event: "error", data: err.value } };
  }
  return { ok: false };
}

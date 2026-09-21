"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseSseEvent } from "@/lib/alert-schema";
import { ANALYZE } from "@/lib/api-paths";
import { feedSse } from "@/lib/sse-parse";
import type { AlertItem } from "@/types/alert";
import type {
  DonePayload,
  ErrorPayload,
  ScorePayload,
} from "@/types/analysis";

export const ANALYZE_TIMEOUT_MS = 30_000;

export const DEFAULT_TIMEOUT_MESSAGE =
  "A análise excedeu o tempo limite de 30 segundos.";

export const PARSE_ERROR_MESSAGE =
  "Falha ao interpretar a resposta da análise.";

export type AnalyzeLanguage =
  | "python"
  | "javascript"
  | "typescript"
  | "java"
  | "go"
  | "php"
  | "ruby"
  | "auto";

export type AnalyzeRequestBody = {
  code: string;
  language: AnalyzeLanguage;
  filename?: string;
};

export type AnalyzeUiError = {
  error: string;
  message: string;
  analysis_id?: string;
};

export type UseSSECallbacks = {
  onAlert: (data: AlertItem) => void;
  onScore: (data: ScorePayload) => void;
  onDone: (data: DonePayload) => void;
  onError: (error: AnalyzeUiError) => void;
};

type AbortReason = "timeout" | "replace" | "unmount" | null;

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

async function readHttpEnvelope(response: Response): Promise<AnalyzeUiError> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
    ) {
      const record = body as {
        error?: unknown;
        message: string;
        analysis_id?: unknown;
      };
      return {
        error:
          typeof record.error === "string"
            ? record.error
            : `HTTP_${response.status}`,
        message: record.message,
        analysis_id:
          typeof record.analysis_id === "string"
            ? record.analysis_id
            : undefined,
      };
    }
  } catch {
    // fall through
  }
  return {
    error: `HTTP_${response.status}`,
    message: `Erro HTTP ${response.status}`,
  };
}

export function useSSE(callbacks: UseSSECallbacks) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const abortRef = useRef<AbortController | null>(null);
  const abortReasonRef = useRef<AbortReason>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutHandle = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const abortInternal = useCallback(
    (reason: AbortReason) => {
      abortReasonRef.current = reason;
      clearTimeoutHandle();
      abortRef.current?.abort();
      abortRef.current = null;
    },
    [clearTimeoutHandle],
  );

  const abort = useCallback(() => {
    abortInternal("replace");
    setIsAnalyzing(false);
  }, [abortInternal]);

  const start = useCallback(
    async (body: AnalyzeRequestBody) => {
      abortInternal("replace");

      const controller = new AbortController();
      abortRef.current = controller;
      abortReasonRef.current = null;
      setIsAnalyzing(true);

      timeoutRef.current = setTimeout(() => {
        abortReasonRef.current = "timeout";
        controller.abort();
      }, ANALYZE_TIMEOUT_MS);

      try {
        const response = await fetch(ANALYZE, {
          method: "POST",
          headers: {
            Accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const envelope = await readHttpEnvelope(response);
          clearTimeoutHandle();
          setIsAnalyzing(false);
          callbacksRef.current.onError(envelope);
          return;
        }

        if (!response.body) {
          clearTimeoutHandle();
          setIsAnalyzing(false);
          callbacksRef.current.onError({
            error: "EMPTY_BODY",
            message: PARSE_ERROR_MESSAGE,
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let terminal = false;

        const handleFrame = (eventName: string, data: unknown): boolean => {
          const parsed = parseSseEvent({ event: eventName, data });
          if (!parsed.ok) {
            callbacksRef.current.onError({
              error: "PARSE_ERROR",
              message: PARSE_ERROR_MESSAGE,
            });
            return true;
          }
          const ev = parsed.value;
          if (ev.event === "alert") {
            callbacksRef.current.onAlert(ev.data);
            return false;
          }
          if (ev.event === "score") {
            callbacksRef.current.onScore(ev.data);
            return false;
          }
          if (ev.event === "done") {
            callbacksRef.current.onDone(ev.data);
            return true;
          }
          const err = ev.data as ErrorPayload;
          callbacksRef.current.onError({
            error: err.error,
            message: err.message,
            analysis_id: err.analysis_id,
          });
          return true;
        };

        while (!terminal) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          const fed = feedSse(buffer, decoder.decode(value, { stream: true }));
          buffer = fed.buffer;
          for (const frame of fed.frames) {
            if (!frame.ok) {
              callbacksRef.current.onError({
                error: "PARSE_ERROR",
                message: PARSE_ERROR_MESSAGE,
              });
              terminal = true;
              break;
            }
            if (handleFrame(frame.event, frame.data)) {
              terminal = true;
              break;
            }
          }
        }

        clearTimeoutHandle();
        setIsAnalyzing(false);
      } catch (err) {
        clearTimeoutHandle();
        setIsAnalyzing(false);
        if (isAbortError(err)) {
          if (abortReasonRef.current === "timeout") {
            callbacksRef.current.onError({
              error: "LLM_TIMEOUT",
              message: DEFAULT_TIMEOUT_MESSAGE,
            });
          }
          return;
        }
        callbacksRef.current.onError({
          error: "NETWORK_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Falha de rede durante a análise.",
        });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        abortReasonRef.current = null;
      }
    },
    [abortInternal, clearTimeoutHandle],
  );

  useEffect(() => {
    return () => {
      abortInternal("unmount");
    };
  }, [abortInternal]);

  return { start, abort, isAnalyzing };
}

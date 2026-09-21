"use client";

import { useCallback, useMemo, useState } from "react";
import {
  INVALID_ALERT_TOAST,
  parseSseEvent,
} from "@/lib/alert-schema";
import { calculateHealthScore } from "@/lib/health-score";
import type { AlertItem, AlertStatus, Severity } from "@/types/alert";
import type { ScorePayload } from "@/types/analysis";

export type SessionAlert = AlertItem & { status: AlertStatus };

export type IngestOutcome =
  | { ok: true }
  | { ok: false; message: string };

const ALL_SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function useAlerts() {
  const [alerts, setAlerts] = useState<SessionAlert[]>([]);
  const [visibleSeverities, setVisibleSeverities] = useState(
    () => new Set<Severity>(ALL_SEVERITIES),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<ScorePayload | null>(null);
  const [analysisDone, setAnalysisDone] = useState(false);

  const openAlerts = useMemo(
    () => alerts.filter((a) => a.status === "OPEN"),
    [alerts],
  );

  const openCount = useMemo(
    () => calculateHealthScore(openAlerts).alert_count,
    [openAlerts],
  );

  const healthScore = useMemo(
    () => calculateHealthScore(openAlerts),
    [openAlerts],
  );

  const filteredAlerts = useMemo(
    () => alerts.filter((a) => visibleSeverities.has(a.severity)),
    [alerts, visibleSeverities],
  );

  const ingest = useCallback((raw: unknown): IngestOutcome => {
    const parsed = parseSseEvent(raw);
    if (!parsed.ok) {
      return { ok: false, message: INVALID_ALERT_TOAST };
    }

    const event = parsed.value;
    if (event.event === "alert") {
      setAlerts((prev) => [...prev, { ...event.data, status: "OPEN" }]);
      return { ok: true };
    }
    if (event.event === "score") {
      setLastScore(event.data);
      return { ok: true };
    }
    if (event.event === "done") {
      setAnalysisDone(true);
      return { ok: true };
    }
    // `error` is handled by useSSE → toast, not session ingest.
    return { ok: false, message: INVALID_ALERT_TOAST };
  }, []);

  /** Clear prior run (alerts, score, done) before a new Analisar — keeps filters. */
  const reset = useCallback(() => {
    setAlerts([]);
    setLastScore(null);
    setAnalysisDone(false);
    setActiveId(null);
  }, []);

  const toggleFilter = useCallback((severity: Severity) => {
    setVisibleSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  }, []);

  const resolveAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "RESOLVED" } : a)),
    );
  }, []);

  const unresolveAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "OPEN" } : a)),
    );
  }, []);

  const selectAlert = useCallback((id: string | null) => {
    setActiveId(id);
  }, []);

  return {
    alerts,
    filteredAlerts,
    visibleSeverities,
    activeId,
    lastScore,
    analysisDone,
    openCount,
    healthScore,
    openAlerts,
    ingest,
    reset,
    toggleFilter,
    resolveAlert,
    unresolveAlert,
    selectAlert,
  };
}

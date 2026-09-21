"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  isGutterMouseTarget,
  lineRange,
  persistentDecorationOptions,
  temporaryDecorationOptions,
} from "@/components/Editor/severityDecorations";
import type { EditorDecoration, EditorInstance } from "@/hooks/useEditor";
import type { SessionAlert } from "@/hooks/useAlerts";
import type { Severity } from "@/types/alert";

/** CA-RF03-03: temporary highlight TTL within 2–3s. */
export const TEMP_HIGHLIGHT_MS = 2500;

export type UseEditorHighlightArgs = {
  getEditor: () => EditorInstance | null;
  editorGeneration: number;
  alerts: SessionAlert[];
  visibleSeverities: Set<Severity>;
  content: string;
  onGutterSelect: (alertId: string) => void;
};

export type UseEditorHighlightReturn = {
  focusAlert: (id: string) => void;
  clearHighlight: (id: string) => void;
  /** Re-sync persistent markers after unresolve (CA-RF08-03 undo). */
  restoreHighlight: (id: string) => void;
};

function visibleOpenAlerts(
  alerts: SessionAlert[],
  visibleSeverities: Set<Severity>,
): SessionAlert[] {
  return alerts.filter(
    (a) => a.status === "OPEN" && visibleSeverities.has(a.severity),
  );
}

function buildPersistentDecorations(alerts: SessionAlert[]): EditorDecoration[] {
  return alerts.map((alert) => ({
    range: lineRange(alert.line_start, alert.line_end),
    options: persistentDecorationOptions(alert.severity),
  }));
}

function scrollCardIntoView(alertId: string): void {
  if (typeof document === "undefined") {
    return;
  }
  const el = document.querySelector(`[data-alert-id="${alertId}"]`);
  if (el instanceof HTMLElement) {
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
}

export function useEditorHighlight({
  getEditor,
  editorGeneration,
  alerts,
  visibleSeverities,
  content,
  onGutterSelect,
}: UseEditorHighlightArgs): UseEditorHighlightReturn {
  const decorationIdsRef = useRef<string[]>([]);
  const alertIdsOrderRef = useRef<string[]>([]);
  const lineToAlertIdRef = useRef<Map<number, string>>(new Map());
  const tempIdsRef = useRef<string[]>([]);
  const tempTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onGutterSelectRef = useRef(onGutterSelect);
  onGutterSelectRef.current = onGutterSelect;

  const alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  const visibleRef = useRef(visibleSeverities);
  visibleRef.current = visibleSeverities;

  const clearTemp = useCallback((editor: EditorInstance | null) => {
    if (tempTimerRef.current !== null) {
      clearTimeout(tempTimerRef.current);
      tempTimerRef.current = null;
    }
    if (editor && tempIdsRef.current.length > 0) {
      editor.deltaDecorations(tempIdsRef.current, []);
    }
    tempIdsRef.current = [];
  }, []);

  const syncPersistent = useCallback(() => {
    const editor = getEditor();
    if (!editor) {
      return;
    }

    const open = visibleOpenAlerts(alertsRef.current, visibleRef.current);
    const nextDecs = buildPersistentDecorations(open);
    const nextIds = editor.deltaDecorations(decorationIdsRef.current, nextDecs);
    decorationIdsRef.current = nextIds;
    alertIdsOrderRef.current = open.map((a) => a.id);

    const lineMap = new Map<number, string>();
    for (const alert of open) {
      lineMap.set(alert.line_start, alert.id);
    }
    lineToAlertIdRef.current = lineMap;
  }, [getEditor]);

  const clearHighlight = useCallback(
    (id: string) => {
      const editor = getEditor();
      if (!editor) {
        return;
      }

      const open = visibleOpenAlerts(
        alertsRef.current,
        visibleRef.current,
      ).filter((a) => a.id !== id);
      const nextDecs = buildPersistentDecorations(open);
      decorationIdsRef.current = editor.deltaDecorations(
        decorationIdsRef.current,
        nextDecs,
      );
      alertIdsOrderRef.current = open.map((a) => a.id);

      const lineMap = new Map<number, string>();
      for (const alert of open) {
        lineMap.set(alert.line_start, alert.id);
      }
      lineToAlertIdRef.current = lineMap;
    },
    [getEditor],
  );

  const restoreHighlight = useCallback(
    (id: string) => {
      const editor = getEditor();
      if (!editor) {
        return;
      }

      const open = visibleOpenAlerts(alertsRef.current, visibleRef.current);
      const target = alertsRef.current.find((a) => a.id === id);
      const list =
        target && !open.some((a) => a.id === id)
          ? [...open, { ...target, status: "OPEN" as const }]
          : open;

      const nextDecs = buildPersistentDecorations(list);
      decorationIdsRef.current = editor.deltaDecorations(
        decorationIdsRef.current,
        nextDecs,
      );
      alertIdsOrderRef.current = list.map((a) => a.id);

      const lineMap = new Map<number, string>();
      for (const alert of list) {
        lineMap.set(alert.line_start, alert.id);
      }
      lineToAlertIdRef.current = lineMap;
    },
    [getEditor],
  );

  const focusAlert = useCallback(
    (id: string) => {
      const editor = getEditor();
      const alert = alertsRef.current.find((a) => a.id === id);
      if (!editor || !alert || alert.status !== "OPEN") {
        return;
      }
      if (!visibleRef.current.has(alert.severity)) {
        return;
      }

      editor.revealLineInCenterIfOutsideViewport(alert.line_start);

      clearTemp(editor);
      tempIdsRef.current = editor.deltaDecorations(
        [],
        [
          {
            range: lineRange(alert.line_start, alert.line_end),
            options: temporaryDecorationOptions(alert.severity),
          },
        ],
      );

      tempTimerRef.current = setTimeout(() => {
        const ed = getEditor();
        if (ed && tempIdsRef.current.length > 0) {
          ed.deltaDecorations(tempIdsRef.current, []);
        }
        tempIdsRef.current = [];
        tempTimerRef.current = null;
      }, TEMP_HIGHLIGHT_MS);
    },
    [clearTemp, getEditor],
  );

  // Sync persistent decorations when alerts / filter / content / editor change
  useEffect(() => {
    syncPersistent();
  }, [alerts, visibleSeverities, content, editorGeneration, syncPersistent]);

  // Content change: drop temp highlights (orphans)
  useEffect(() => {
    clearTemp(getEditor());
  }, [content, clearTemp, getEditor]);

  // Glyph margin → select card + scroll panel
  useEffect(() => {
    const editor = getEditor();
    if (!editor) {
      return;
    }

    const disposable = editor.onMouseDown((e) => {
      if (!isGutterMouseTarget(e.target.type)) {
        return;
      }
      const line = e.target.position?.lineNumber;
      if (line == null) {
        return;
      }
      const alertId = lineToAlertIdRef.current.get(line);
      if (!alertId) {
        return;
      }
      onGutterSelectRef.current(alertId);
      scrollCardIntoView(alertId);
    });

    return () => {
      disposable.dispose();
    };
  }, [editorGeneration, getEditor]);

  useEffect(() => {
    return () => {
      clearTemp(getEditor());
      const editor = getEditor();
      if (editor && decorationIdsRef.current.length > 0) {
        editor.deltaDecorations(decorationIdsRef.current, []);
      }
      decorationIdsRef.current = [];
      alertIdsOrderRef.current = [];
      lineToAlertIdRef.current = new Map();
    };
  }, [clearTemp, getEditor]);

  return { focusAlert, clearHighlight, restoreHighlight };
}

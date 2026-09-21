"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  alertToEditRange,
  extractSnippet,
} from "@/lib/alert-edit-range";
import {
  APPLY_FIX_EDIT_SOURCE,
  type ApplyEditInput,
  type EditorDisposable,
  type EditorInstance,
} from "@/hooks/useEditor";
import type { SessionAlert } from "@/hooks/useAlerts";

export const EDITOR_NOT_READY_TOAST = "Editor não pronto";
export const INVALID_RANGE_TOAST = "Não foi possível aplicar a correção";

type ApplySnapshot = {
  alertId: string;
  beforeSnippet: string;
  lineStart: number;
  lineEnd: number;
};

export type UseApplyFixArgs = {
  getEditor: () => EditorInstance | null;
  /** Prefer model value; falls back to React content for tests. */
  getContent: () => string;
  applyEdit: (edit: ApplyEditInput, source?: string) => void;
  resolveAlert: (id: string) => void;
  unresolveAlert: (id: string) => void;
  clearHighlight: (id: string) => void;
  restoreHighlight: (id: string) => void;
  editorGeneration: number;
  subscribeContentChange?: (listener: () => void) => EditorDisposable;
  onEditorNotReady?: () => void;
  onInvalidRange?: () => void;
};

export type UseApplyFixReturn = {
  applyFix: (alert: SessionAlert) => void;
  applying: boolean;
};

export function useApplyFix({
  getEditor,
  getContent,
  applyEdit,
  resolveAlert,
  unresolveAlert,
  clearHighlight,
  restoreHighlight,
  editorGeneration,
  subscribeContentChange,
  onEditorNotReady,
  onInvalidRange,
}: UseApplyFixArgs): UseApplyFixReturn {
  const [applying, setApplying] = useState(false);
  const applyingRef = useRef(false);
  const snapshotsRef = useRef<Map<string, ApplySnapshot>>(new Map());

  const readContent = useCallback(() => {
    const model = getEditor()?.getModel();
    if (model) {
      return model.getValue();
    }
    return getContent();
  }, [getContent, getEditor]);

  const syncUndoFromContent = useCallback(() => {
    const content = readContent();
    for (const [id, snap] of [...snapshotsRef.current.entries()]) {
      const current = extractSnippet(content, snap.lineStart, snap.lineEnd);
      if (current === snap.beforeSnippet) {
        snapshotsRef.current.delete(id);
        unresolveAlert(id);
        restoreHighlight(id);
      }
    }
  }, [readContent, restoreHighlight, unresolveAlert]);

  useEffect(() => {
    if (subscribeContentChange) {
      const sub = subscribeContentChange(() => {
        syncUndoFromContent();
      });
      return () => sub.dispose();
    }

    const editor = getEditor();
    if (!editor) {
      return;
    }
    const sub = editor.onDidChangeModelContent(() => {
      syncUndoFromContent();
    });
    return () => sub.dispose();
  }, [
    editorGeneration,
    getEditor,
    subscribeContentChange,
    syncUndoFromContent,
  ]);

  const applyFix = useCallback(
    (alert: SessionAlert) => {
      if (alert.status !== "OPEN" || applyingRef.current) {
        return;
      }
      if (snapshotsRef.current.has(alert.id)) {
        return;
      }

      const editor = getEditor();
      if (!editor) {
        onEditorNotReady?.();
        return;
      }

      const mapped = alertToEditRange(
        readContent(),
        alert.line_start,
        alert.line_end,
        alert.suggestion,
      );
      if (!mapped.ok) {
        onInvalidRange?.();
        return;
      }

      applyingRef.current = true;
      setApplying(true);
      try {
        snapshotsRef.current.set(alert.id, {
          alertId: alert.id,
          beforeSnippet: mapped.beforeSnippet,
          lineStart: alert.line_start,
          lineEnd: alert.line_end,
        });
        applyEdit(mapped.edit, APPLY_FIX_EDIT_SOURCE);
        resolveAlert(alert.id);
        clearHighlight(alert.id);
      } finally {
        applyingRef.current = false;
        setApplying(false);
      }
    },
    [
      applyEdit,
      clearHighlight,
      getEditor,
      onEditorNotReady,
      onInvalidRange,
      readContent,
      resolveAlert,
    ],
  );

  return { applyFix, applying };
}

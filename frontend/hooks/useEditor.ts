"use client";

import { useCallback, useRef, useState } from "react";

export type EditorMode = "manual" | "upload" | "url";

export type EditorLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "go"
  | "java"
  | "rust"
  | "php"
  | "ruby"
  | "plaintext";

export type ApplyEditInput = {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
};

export type EditorDecoration = {
  range: ApplyEditInput["range"];
  options: Record<string, unknown>;
};

export type EditorMouseTarget = {
  type?: number | string;
  position?: { lineNumber: number; column: number } | null;
};

export type EditorMouseEvent = {
  target: EditorMouseTarget;
};

export type EditorDisposable = {
  dispose: () => void;
};

/** Minimal Monaco surface used by applyEdit / undo / highlights — avoids hard dep on monaco-editor types. */
export type EditorInstance = {
  executeEdits: (
    source: string,
    edits: Array<{ range: ApplyEditInput["range"]; text: string }>,
  ) => void;
  trigger: (source: string, handlerId: string, payload: unknown) => void;
  getModel: () => { getValue: () => string } | null;
  deltaDecorations: (
    oldDecorations: string[],
    newDecorations: EditorDecoration[],
  ) => string[];
  revealLineInCenterIfOutsideViewport: (lineNumber: number) => void;
  onMouseDown: (listener: (e: EditorMouseEvent) => void) => EditorDisposable;
  onDidChangeModelContent: (
    listener: () => void,
  ) => EditorDisposable;
};

/** Stable executeEdits source for RF04 apply (undo stack / CT07). */
export const APPLY_FIX_EDIT_SOURCE = "apply-fix";

const EXT_TO_LANGUAGE: Record<string, EditorLanguage> = {
  ".py": "python",
  ".js": "javascript",
  ".ts": "typescript",
  ".jsx": "javascript",
  ".tsx": "typescript",
  ".java": "java",
  ".go": "go",
  ".php": "php",
  ".rb": "ruby",
  ".rs": "rust",
};

export function languageFromExtension(filename: string): EditorLanguage {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot < 0) {
    return "plaintext";
  }
  return EXT_TO_LANGUAGE[lower.slice(dot)] ?? "plaintext";
}

export type UseEditorReturn = {
  content: string;
  language: EditorLanguage;
  mode: EditorMode;
  /** Bumps when Monaco mounts/unmounts so highlight hooks can attach listeners. */
  editorGeneration: number;
  setContent: (value: string) => void;
  setLanguage: (language: EditorLanguage) => void;
  setMode: (mode: EditorMode) => void;
  applyEdit: (edit: ApplyEditInput, source?: string) => void;
  undo: () => void;
  registerEditor: (instance: EditorInstance | null) => void;
  getEditor: () => EditorInstance | null;
  /** Subscribe to Monaco model content changes (D2 undo sync). */
  subscribeContentChange: (listener: () => void) => EditorDisposable;
};

export function useEditor(
  initial?: Partial<{
    content: string;
    language: EditorLanguage;
    mode: EditorMode;
  }>,
): UseEditorReturn {
  const [content, setContentState] = useState(initial?.content ?? "");
  const [language, setLanguage] = useState<EditorLanguage>(
    initial?.language ?? "typescript",
  );
  const [mode, setMode] = useState<EditorMode>(initial?.mode ?? "manual");
  const [editorGeneration, setEditorGeneration] = useState(0);
  const editorRef = useRef<EditorInstance | null>(null);

  const setContent = useCallback((value: string) => {
    setContentState(value);
  }, []);

  const registerEditor = useCallback((instance: EditorInstance | null) => {
    editorRef.current = instance;
    setEditorGeneration((n) => n + 1);
  }, []);

  const getEditor = useCallback(() => editorRef.current, []);

  const applyEdit = useCallback(
    (edit: ApplyEditInput, source = "useEditor.applyEdit") => {
      const ed = editorRef.current;
      if (!ed) {
        setContentState(edit.text);
        return;
      }
      ed.executeEdits(source, [
        {
          range: edit.range,
          text: edit.text,
        },
      ]);
      const model = ed.getModel();
      if (model) {
        setContentState(model.getValue());
      }
    },
    [],
  );

  const undo = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) {
      return;
    }
    ed.trigger("useEditor", "undo", null);
    const model = ed.getModel();
    if (model) {
      setContentState(model.getValue());
    }
  }, []);

  const subscribeContentChange = useCallback((listener: () => void) => {
    const ed = editorRef.current;
    if (!ed) {
      return { dispose: () => undefined };
    }
    return ed.onDidChangeModelContent(() => {
      const model = ed.getModel();
      if (model) {
        setContentState(model.getValue());
      }
      listener();
    });
  }, []);

  return {
    content,
    language,
    mode,
    editorGeneration,
    setContent,
    setLanguage,
    setMode,
    applyEdit,
    undo,
    registerEditor,
    getEditor,
    subscribeContentChange,
  };
}

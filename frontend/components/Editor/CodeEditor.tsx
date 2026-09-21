"use client";

import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import type { EditorInstance, EditorLanguage } from "@/hooks/useEditor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full min-h-[240px] items-center justify-center border border-hairline bg-surface-l1 font-mono text-sm text-gray-400"
      role="status"
    >
      Carregando editor…
    </div>
  ),
});

export const EDITOR_LANGUAGES: { value: EditorLanguage; label: string }[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "plaintext", label: "Plain text" },
];

type CodeEditorProps = {
  content: string;
  language: EditorLanguage;
  onContentChange: (value: string) => void;
  onLanguageChange: (language: EditorLanguage) => void;
  onEditorMount?: (editor: EditorInstance) => void;
  readOnly?: boolean;
};

export function CodeEditor({
  content,
  language,
  onContentChange,
  onLanguageChange,
  onEditorMount,
  readOnly = false,
}: CodeEditorProps) {
  const handleMount: OnMount = (editor) => {
    onEditorMount?.(editor as unknown as EditorInstance);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-hairline bg-surface-l1">
      <div className="flex items-center justify-between border-b border-hairline bg-surface-l2 px-3 py-2">
        <label className="font-display flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
          Linguagem
          <select
            className="rounded-none border border-hairline-strong bg-canvas px-2 py-1 font-mono text-sm normal-case text-gray-100"
            value={language}
            onChange={(e) =>
              onLanguageChange(e.target.value as EditorLanguage)
            }
            aria-label="Linguagem do editor"
          >
            {EDITOR_LANGUAGES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="min-h-[320px] flex-1" data-testid="code-editor">
        <MonacoEditor
          height="100%"
          language={language === "plaintext" ? "plaintext" : language}
          theme="vs-dark"
          value={content}
          onChange={(value) => onContentChange(value ?? "")}
          onMount={handleMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            glyphMargin: true,
            lineDecorationsWidth: 10,
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: 13,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}

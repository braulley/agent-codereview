"use client";

import type { EditorMode } from "@/hooks/useEditor";

const TABS: { id: EditorMode; label: string }[] = [
  { id: "manual", label: "Código Manual" },
  { id: "upload", label: "Upload Arquivo" },
  { id: "url", label: "URL PR/MR" },
];

type InputTabsProps = {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
};

export function InputTabs({ mode, onModeChange }: InputTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Modos de entrada"
      className="flex border-b border-hairline"
    >
      {TABS.map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`input-tab-${tab.id}`}
            aria-selected={active}
            aria-controls="input-tab-panel"
            className={[
              "font-display rounded-none px-4 py-2 text-sm uppercase tracking-wide",
              active
                ? "border-t-2 border-beacon bg-surface-l2 text-gray-100"
                : "border-t-2 border-transparent bg-surface-l1 text-gray-400",
            ].join(" ")}
            onClick={() => onModeChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { splitUnifiedDiff } from "@/lib/diff-split";

const ReactDiffViewer = dynamic(
  () => import("react-diff-viewer-continued"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[160px] items-center justify-center border border-hairline bg-surface-l1 font-mono text-sm text-gray-400"
        role="status"
      >
        Carregando diff…
      </div>
    ),
  },
);

export type DiffViewMode = "side-by-side" | "unified";

type DiffViewerProps = {
  /** Unified diff text or already-separated sides via oldValue/newValue */
  diffText?: string;
  oldValue?: string;
  newValue?: string;
  /** Session alerts — passed through so toggle never clears parent state (CA-RF07-02) */
  alerts?: unknown[];
  onViewModeChange?: (mode: DiffViewMode) => void;
};

const DARK_STYLES = {
  variables: {
    dark: {
      diffViewerBackground: "#111827",
      diffViewerColor: "#E5E7EB",
      addedBackground: "rgba(16, 185, 129, 0.15)",
      addedColor: "#E5E7EB",
      removedBackground: "rgba(239, 68, 68, 0.15)",
      removedColor: "#E5E7EB",
      wordAddedBackground: "rgba(16, 185, 129, 0.35)",
      wordRemovedBackground: "rgba(239, 68, 68, 0.35)",
      addedGutterBackground: "#161F30",
      removedGutterBackground: "#161F30",
      gutterBackground: "#090D16",
      gutterBackgroundDark: "#090D16",
      highlightBackground: "rgba(249, 115, 22, 0.2)",
      highlightGutterBackground: "rgba(249, 115, 22, 0.3)",
      codeFoldGutterBackground: "#161F30",
      codeFoldBackground: "#161F30",
      emptyLineBackground: "#111827",
      gutterColor: "#9CA3AF",
      addedGutterColor: "#9CA3AF",
      removedGutterColor: "#9CA3AF",
      codeFoldContentColor: "#9CA3AF",
      diffViewerTitleBackground: "#161F30",
      diffViewerTitleColor: "#E5E7EB",
      diffViewerTitleBorderColor: "#1F2937",
    },
  },
  line: {
    borderRadius: "0",
  },
};

export function DiffViewer({
  diffText = "",
  oldValue: oldProp,
  newValue: newProp,
  alerts,
  onViewModeChange,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>("side-by-side");
  const [hunkIndex, setHunkIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const split = useMemo(() => {
    if (oldProp !== undefined && newProp !== undefined) {
      return {
        oldValue: oldProp,
        newValue: newProp,
        hunkStarts: [0],
      };
    }
    return splitUnifiedDiff(diffText);
  }, [diffText, oldProp, newProp]);

  function changeMode(next: DiffViewMode) {
    setViewMode(next);
    onViewModeChange?.(next);
    // alerts prop is intentionally unused here — parent owns alert list (CA-RF07-02)
    void alerts;
  }

  function focusHunk(nextIndex: number) {
    const starts = split.hunkStarts;
    if (starts.length === 0) {
      return;
    }
    const clamped = ((nextIndex % starts.length) + starts.length) % starts.length;
    setHunkIndex(clamped);
    const root = containerRef.current;
    if (!root) {
      return;
    }
    const rows = root.querySelectorAll("tr");
    // Best-effort: scroll toward hunk region by approximate row index
    const targetRow = rows[Math.min(starts[clamped] ?? 0, rows.length - 1)];
    targetRow?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  const splitView = viewMode === "side-by-side";

  return (
    <div
      className="flex min-h-0 flex-col border border-hairline bg-surface-l1"
      data-testid="diff-viewer"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-surface-l2 px-3 py-2">
        <div
          role="group"
          aria-label="Modo de diff"
          className="flex border border-hairline"
        >
          <button
            type="button"
            className={[
              "font-display rounded-none px-3 py-1 text-xs uppercase tracking-wide",
              splitView
                ? "bg-beacon text-canvas"
                : "bg-surface-l1 text-gray-400",
            ].join(" ")}
            aria-pressed={splitView}
            onClick={() => changeMode("side-by-side")}
          >
            Side-by-side
          </button>
          <button
            type="button"
            className={[
              "font-display rounded-none px-3 py-1 text-xs uppercase tracking-wide",
              !splitView
                ? "bg-beacon text-canvas"
                : "bg-surface-l1 text-gray-400",
            ].join(" ")}
            aria-pressed={!splitView}
            onClick={() => changeMode("unified")}
          >
            Unified
          </button>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="!px-2 !py-1 !text-xs"
            onClick={() => focusHunk(hunkIndex - 1)}
            aria-label="Hunk anterior"
          >
            Anterior
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="!px-2 !py-1 !text-xs"
            onClick={() => focusHunk(hunkIndex + 1)}
            aria-label="Próximo hunk"
          >
            Próximo
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className="max-h-[480px] overflow-auto font-mono text-sm"
        data-testid="diff-viewer-body"
        data-view-mode={viewMode}
        data-alerts-count={Array.isArray(alerts) ? alerts.length : 0}
      >
        <ReactDiffViewer
          oldValue={split.oldValue}
          newValue={split.newValue}
          splitView={splitView}
          useDarkTheme
          styles={DARK_STYLES}
          leftTitle={splitView ? "Anterior" : undefined}
          rightTitle={splitView ? "Posterior" : undefined}
        />
      </div>
    </div>
  );
}

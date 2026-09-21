"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertPanel } from "@/components/AlertPanel/AlertPanel";
import { SeverityFilters } from "@/components/AlertPanel/SeverityFilters";
import { DiffViewer } from "@/components/DiffViewer/DiffViewer";
import { CodeEditor } from "@/components/Editor/CodeEditor";
import { FileUpload } from "@/components/Editor/FileUpload";
import { InputTabs } from "@/components/Editor/InputTabs";
import { PrUrlInput } from "@/components/Editor/PrUrlInput";
import { HealthDashboard } from "@/components/HealthDashboard/HealthDashboard";
import { Button } from "@/components/ui/Button";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { Spinner } from "@/components/ui/Spinner";
import { ToastHost, type ToastItem } from "@/components/ui/ToastHost";
import {
  EDITOR_NOT_READY_TOAST,
  INVALID_RANGE_TOAST,
  useApplyFix,
} from "@/hooks/useApplyFix";
import { useAlerts } from "@/hooks/useAlerts";
import { useEditor, type EditorLanguage } from "@/hooks/useEditor";
import { useEditorHighlight } from "@/hooks/useEditorHighlight";
import {
  type AnalyzeLanguage,
  type AnalyzeUiError,
  useSSE,
} from "@/hooks/useSSE";
import { ACR_INGEST_EVENT } from "@/lib/acr-ingest-event";

type Pane = "telemetry" | "editor" | "remediation";

const TABS: { id: Pane; label: string }[] = [
  { id: "telemetry", label: "Telemetry" },
  { id: "editor", label: "Editor" },
  { id: "remediation", label: "Remediation" },
];

const EMPTY_EDITOR_TOAST = "Cole código no editor antes de analisar.";

function toAnalyzeLanguage(language: EditorLanguage): AnalyzeLanguage {
  switch (language) {
    case "python":
    case "javascript":
    case "typescript":
    case "java":
    case "go":
    case "php":
    case "ruby":
      return language;
    default:
      return "auto";
  }
}

function AlertPanelSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando alertas"
      data-testid="alert-panel-skeleton"
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <div className="h-16 border border-hairline bg-surface-l2" />
      <div className="h-16 border border-hairline bg-surface-l2" />
      <div className="h-12 border border-hairline bg-surface-l2" />
    </div>
  );
}

/**
 * Three-pane shell + C07–C11 analyze SSE orchestration.
 */
export default function Home() {
  const [activePane, setActivePane] = useState<Pane>("editor");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [offline, setOffline] = useState(false);
  const editor = useEditor();
  const session = useAlerts();
  const { ingest, reset } = session;
  const startAnalysisRef = useRef<() => void>(() => undefined);

  const highlight = useEditorHighlight({
    getEditor: editor.getEditor,
    editorGeneration: editor.editorGeneration,
    alerts: session.alerts,
    visibleSeverities: session.visibleSeverities,
    content: editor.content,
    onGutterSelect: session.selectAlert,
  });

  const { selectAlert } = session;
  const { focusAlert } = highlight;

  const dismissErrorToasts = useCallback(() => {
    setToasts((prev) => prev.filter((t) => !t.action));
  }, []);

  const pushToast = useCallback((item: Omit<ToastItem, "id"> | string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}`;
    if (typeof item === "string") {
      setToasts((prev) => [...prev, { id, message: item }]);
      return;
    }
    setToasts((prev) => [...prev, { id, ...item }]);
  }, []);

  const handleAnalyzeError = useCallback(
    (err: AnalyzeUiError) => {
      pushToast({
        message: err.message,
        action: {
          label: "Tentar Novamente",
          onClick: () => {
            startAnalysisRef.current();
          },
        },
      });
    },
    [pushToast],
  );

  const sse = useSSE({
    onAlert: (data) => {
      const outcome = ingest({ event: "alert", data });
      if (!outcome.ok) {
        pushToast(outcome.message);
      }
    },
    onScore: (data) => {
      ingest({ event: "score", data });
    },
    onDone: (data) => {
      ingest({ event: "done", data });
    },
    onError: handleAnalyzeError,
  });

  const { start, isAnalyzing } = sse;

  const startAnalysis = useCallback(() => {
    const code = editor.content;
    if (!code.trim()) {
      pushToast(EMPTY_EDITOR_TOAST);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }
    dismissErrorToasts();
    reset();
    void start({
      code,
      language: toAnalyzeLanguage(editor.language),
    });
  }, [
    dismissErrorToasts,
    editor.content,
    editor.language,
    pushToast,
    reset,
    start,
  ]);

  startAnalysisRef.current = startAnalysis;

  const { applyFix, applying } = useApplyFix({
    getEditor: editor.getEditor,
    getContent: () => editor.content,
    applyEdit: editor.applyEdit,
    resolveAlert: session.resolveAlert,
    unresolveAlert: session.unresolveAlert,
    clearHighlight: highlight.clearHighlight,
    restoreHighlight: highlight.restoreHighlight,
    editorGeneration: editor.editorGeneration,
    subscribeContentChange: editor.subscribeContentChange,
    onEditorNotReady: () => pushToast(EDITOR_NOT_READY_TOAST),
    onInvalidRange: () => pushToast(INVALID_RANGE_TOAST),
  });

  const handleSelectAlert = useCallback(
    (id: string) => {
      selectAlert(id);
      focusAlert(id);
    },
    [selectAlert, focusAlert],
  );

  const handleApplyFix = useCallback(
    (id: string) => {
      const alert = session.alerts.find((a) => a.id === id);
      if (!alert) {
        return;
      }
      applyFix(alert);
    },
    [applyFix, session.alerts],
  );

  const ingestEvent = useCallback(
    (raw: unknown) => {
      const outcome = ingest(raw);
      if (!outcome.ok) {
        pushToast(outcome.message);
      }
      return outcome;
    },
    [ingest, pushToast],
  );

  useEffect(() => {
    function onIngest(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail;
      ingestEvent(detail);
    }
    window.addEventListener(ACR_INGEST_EVENT, onIngest);
    return () => window.removeEventListener(ACR_INGEST_EVENT, onIngest);
  }, [ingestEvent]);

  useEffect(() => {
    function onOffline() {
      setOffline(true);
    }
    function onOnline() {
      setOffline(false);
    }
    setOffline(!navigator.onLine);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const showSkeleton = isAnalyzing && session.alerts.length === 0;
  const analyzeDisabled = isAnalyzing || offline;

  return (
    <div className="flex h-[100vh] min-h-dvh flex-col overflow-hidden bg-canvas">
      <OfflineBanner />
      <nav
        aria-label="Shell panes"
        className="flex shrink-0 border-b border-hairline lg:hidden"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`font-display flex-1 px-3 py-2 text-sm uppercase tracking-wide ${
              activePane === tab.id
                ? "border-b-2 border-beacon text-beacon"
                : "text-gray-400"
            }`}
            aria-pressed={activePane === tab.id}
            onClick={() => setActivePane(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        className={[
          "grid min-h-0 flex-1",
          "xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(320px,420px)]",
          "lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]",
          "grid-cols-1",
        ].join(" ")}
      >
        <aside
          aria-label="Left Telemetry Rail"
          className={[
            "min-h-0 flex-col gap-4 overflow-auto border-r border-hairline bg-surface-l1 p-4",
            activePane === "telemetry" ? "flex" : "hidden",
            "lg:flex",
          ].join(" ")}
        >
          <HealthDashboard alerts={session.alerts} />
          <SeverityFilters
            visibleSeverities={session.visibleSeverities}
            openCount={session.openCount}
            onToggle={session.toggleFilter}
          />
        </aside>

        <main
          aria-label="Central Stage"
          className={[
            "relative min-h-0 flex-col gap-3 overflow-auto bg-canvas p-4",
            activePane === "editor" ? "flex" : "hidden",
            "lg:flex",
          ].join(" ")}
        >
          <div className="mb-0 flex items-center justify-between gap-3">
            <Button
              variant="primary"
              disabled={analyzeDisabled}
              aria-busy={isAnalyzing}
              onClick={startAnalysis}
            >
              {isAnalyzing ? <Spinner label="Analisando" /> : "Analisar"}
            </Button>
            <div className="hidden items-center justify-end lg:flex xl:hidden">
              <button
                type="button"
                className="font-display border border-hairline-strong bg-surface-l2 px-3 py-1 text-xs uppercase tracking-wide text-beacon"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen((open) => !open)}
              >
                Abrir drawer
              </button>
            </div>
          </div>

          <InputTabs mode={editor.mode} onModeChange={editor.setMode} />

          {editor.mode === "upload" ? (
            <FileUpload
              onLoaded={(content, language) => {
                editor.setContent(content);
                editor.setLanguage(language);
              }}
            />
          ) : null}

          {editor.mode === "url" ? (
            <PrUrlInput
              onDiffLoaded={(diffContent) => {
                editor.setContent(diffContent);
                editor.setLanguage("plaintext");
              }}
            />
          ) : null}

          {editor.mode === "url" && editor.content ? (
            <DiffViewer diffText={editor.content} alerts={session.alerts} />
          ) : null}

          <CodeEditor
            content={editor.content}
            language={editor.language}
            onContentChange={editor.setContent}
            onLanguageChange={editor.setLanguage}
            onEditorMount={editor.registerEditor}
          />
        </main>

        <aside
          aria-label="Right Action Drawer"
          className={[
            "min-h-0 flex-col overflow-auto border-l border-hairline bg-surface-l1 p-4",
            activePane === "remediation" ? "flex" : "hidden",
            drawerOpen
              ? "lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:flex lg:w-[min(420px,100%)] lg:shadow-none"
              : "lg:hidden",
            "xl:static xl:flex xl:w-auto",
          ].join(" ")}
        >
          <button
            type="button"
            className="font-display mb-4 border border-hairline px-2 py-1 text-xs uppercase lg:inline-block xl:hidden"
            onClick={() => setDrawerOpen(false)}
          >
            Fechar
          </button>
          {showSkeleton ? (
            <AlertPanelSkeleton />
          ) : (
            <AlertPanel
              alerts={session.filteredAlerts}
              activeId={session.activeId}
              onSelect={handleSelectAlert}
              onApplyFix={handleApplyFix}
              applyDisabled={applying}
            />
          )}
        </aside>
      </div>

      <ToastHost items={toasts} />
    </div>
  );
}

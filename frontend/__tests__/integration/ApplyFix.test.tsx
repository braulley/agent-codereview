import {
  act,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useRef } from "react";
import { AlertPanel } from "@/components/AlertPanel/AlertPanel";
import { HealthDashboard } from "@/components/HealthDashboard/HealthDashboard";
import {
  EDITOR_NOT_READY_TOAST,
  useApplyFix,
} from "@/hooks/useApplyFix";
import { useAlerts, type SessionAlert } from "@/hooks/useAlerts";
import {
  type ApplyEditInput,
  type EditorInstance,
  useEditor,
} from "@/hooks/useEditor";
import { useEditorHighlight } from "@/hooks/useEditorHighlight";

const CT01_ID = "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c";
const OTHER_ID = "b4e9d3f2-5e6c-4f3a-9b2d-0c8e4f7a3b1d";

const BAD_LINE =
  '    cursor.execute("SELECT * FROM users WHERE id = " + user_input)';
const SUGGESTION =
  "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))";

function makeContent(line12: string): string {
  return Array.from({ length: 13 }, (_, i) =>
    i === 11 ? line12 : `line-${i + 1}`,
  ).join("\n");
}

function seedAlert(
  partial: Partial<SessionAlert> & Pick<SessionAlert, "id" | "severity">,
): Omit<SessionAlert, "status"> {
  return {
    file: "users.py",
    line_start: 12,
    line_end: 12,
    title: "SQL Injection",
    description: "desc",
    suggestion: SUGGESTION,
    category: "SECURITY",
    ...partial,
    // status must not appear on ingest payload
  } as Omit<SessionAlert, "status">;
}

type MockEditorApi = {
  instance: EditorInstance;
  getValue: () => string;
  setValue: (v: string) => void;
  executeEdits: jest.Mock;
};

function createMockEditor(initial: string): MockEditorApi {
  let value = initial;
  let contentListener: (() => void) | null = null;
  const executeEdits = jest.fn(
    (
      _source: string,
      edits: Array<{ range: ApplyEditInput["range"]; text: string }>,
    ) => {
      const edit = edits[0];
      if (!edit) return;
      const lines = value.split("\n");
      const start = edit.range.startLineNumber - 1;
      const end = edit.range.endLineNumber - 1;
      value = [
        ...lines.slice(0, start),
        ...edit.text.split("\n"),
        ...lines.slice(end + 1),
      ].join("\n");
      contentListener?.();
    },
  );

  const instance: EditorInstance = {
    executeEdits,
    trigger: jest.fn(),
    getModel: () => ({ getValue: () => value }),
    deltaDecorations: jest.fn(() => []),
    revealLineInCenterIfOutsideViewport: jest.fn(),
    onMouseDown: jest.fn(() => ({
      dispose: jest.fn(),
    })),
    onDidChangeModelContent: jest.fn((listener: () => void) => {
      contentListener = listener;
      return {
        dispose: () => {
          contentListener = null;
        },
      };
    }),
  };

  return {
    instance,
    executeEdits,
    getValue: () => value,
    setValue: (v: string) => {
      value = v;
      contentListener?.();
    },
  };
}

function ApplyFixHarness({
  mock,
  seeds,
}: {
  mock: MockEditorApi;
  seeds: Array<Omit<SessionAlert, "status">>;
}) {
  const editor = useEditor({ content: mock.getValue() });
  const session = useAlerts();
  const seeded = useRef(false);

  const highlight = useEditorHighlight({
    getEditor: editor.getEditor,
    editorGeneration: editor.editorGeneration,
    alerts: session.alerts,
    visibleSeverities: session.visibleSeverities,
    content: editor.content,
    onGutterSelect: session.selectAlert,
  });

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
  });

  useEffect(() => {
    editor.registerEditor(mock.instance);
    return () => editor.registerEditor(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    for (const a of seeds) {
      session.ingest({ event: "alert", data: a });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <HealthDashboard alerts={session.alerts} />
      <AlertPanel
        alerts={session.filteredAlerts}
        activeId={session.activeId}
        onSelect={session.selectAlert}
        onApplyFix={(id) => {
          const alert = session.alerts.find((a) => a.id === id);
          if (alert) applyFix(alert);
        }}
        applyDisabled={applying}
      />
      <button
        type="button"
        data-testid="trigger-undo"
        onClick={() => mock.setValue(makeContent(BAD_LINE))}
      >
        Undo
      </button>
    </div>
  );
}

describe("ApplyFix integration", () => {
  it("click applies and marks RESOLVED; other card intact (CA-RF04-02/03)", async () => {
    const user = userEvent.setup();
    const original = makeContent(BAD_LINE);
    const mock = createMockEditor(original);

    render(
      <ApplyFixHarness
        mock={mock}
        seeds={[
          seedAlert({
            id: CT01_ID,
            severity: "CRITICAL",
            line_start: 12,
            line_end: 12,
            suggestion: SUGGESTION,
          }),
          seedAlert({
            id: OTHER_ID,
            severity: "HIGH",
            file: "other.py",
            line_start: 3,
            line_end: 3,
            title: "Other finding",
            suggestion: "other-fix",
          }),
        ]}
      />,
    );

    const cards = screen.getAllByTestId("alert-card");
    expect(cards).toHaveLength(2);

    const first = cards.find((c) => c.getAttribute("data-alert-id") === CT01_ID);
    expect(first).toBeTruthy();
    const btn = within(first!).getByRole("button", {
      name: "Aplicar Correção",
    });

    await user.click(btn);

    expect(first).toHaveAttribute("data-status", "RESOLVED");
    const other = cards.find(
      (c) => c.getAttribute("data-alert-id") === OTHER_ID,
    );
    expect(other).toHaveAttribute("data-status", "OPEN");
    expect(mock.getValue()).toContain(SUGGESTION);
  });

  it("score CRITICAL→100 on apply and back to 75 on undo (CA-RF04-05, CT07)", async () => {
    const user = userEvent.setup();
    const original = makeContent(BAD_LINE);
    const mock = createMockEditor(original);

    render(
      <ApplyFixHarness
        mock={mock}
        seeds={[
          seedAlert({
            id: CT01_ID,
            severity: "CRITICAL",
            line_start: 12,
            line_end: 12,
            suggestion: SUGGESTION,
          }),
        ]}
      />,
    );

    expect(screen.getByTestId("health-score")).toHaveTextContent("75");

    const card = screen.getByTestId("alert-card");
    await user.click(
      within(card).getByRole("button", { name: "Aplicar Correção" }),
    );

    expect(card).toHaveAttribute("data-status", "RESOLVED");
    expect(screen.getByTestId("health-score")).toHaveTextContent("100");

    await user.click(screen.getByTestId("trigger-undo"));

    expect(screen.getByTestId("alert-card")).toHaveAttribute(
      "data-status",
      "OPEN",
    );
    expect(screen.getByTestId("health-score")).toHaveTextContent("75");
    expect(mock.getValue()).toBe(original);
  });

  it("does not reference analyze endpoint toast path on happy apply", async () => {
    const user = userEvent.setup();
    const mock = createMockEditor(makeContent(BAD_LINE));
    render(
      <ApplyFixHarness
        mock={mock}
        seeds={[
          seedAlert({
            id: CT01_ID,
            severity: "CRITICAL",
            suggestion: SUGGESTION,
          }),
        ]}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Aplicar Correção" }),
    );
    expect(screen.queryByText(EDITOR_NOT_READY_TOAST)).not.toBeInTheDocument();
  });
});

describe("ApplyFix score timing", () => {
  it("resolve path updates OPEN score under 100ms", () => {
    const resolveAlert = jest.fn();
    const mock = createMockEditor(makeContent(BAD_LINE));
    const applyEdit = jest.fn((edit: ApplyEditInput, source?: string) => {
      mock.instance.executeEdits(source ?? "t", [edit]);
    });

    const { result } = renderHook(() =>
      useApplyFix({
        getEditor: () => mock.instance,
        getContent: () => mock.getValue(),
        applyEdit,
        resolveAlert,
        unresolveAlert: jest.fn(),
        clearHighlight: jest.fn(),
        restoreHighlight: jest.fn(),
        editorGeneration: 1,
      }),
    );

    const alert: SessionAlert = {
      ...seedAlert({ id: CT01_ID, severity: "CRITICAL" }),
      status: "OPEN",
    };

    const t0 = performance.now();
    act(() => {
      result.current.applyFix(alert);
    });
    const elapsed = performance.now() - t0;
    expect(resolveAlert).toHaveBeenCalled();
    expect(elapsed).toBeLessThan(100);
  });
});

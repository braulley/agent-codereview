import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useEffect, useRef } from "react";
import { AlertPanel } from "@/components/AlertPanel/AlertPanel";
import { SeverityFilters } from "@/components/AlertPanel/SeverityFilters";
import { useAlerts, type SessionAlert } from "@/hooks/useAlerts";
import {
  type EditorDecoration,
  type EditorInstance,
  type EditorMouseEvent,
  useEditor,
} from "@/hooks/useEditor";
import { useEditorHighlight } from "@/hooks/useEditorHighlight";

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `a3f8c2e1-4d5b-4e2f-8a1c-${hex}`;
}

function makeAlert(
  partial: Partial<SessionAlert> & Pick<SessionAlert, "id" | "severity">,
): SessionAlert {
  return {
    file: "a.py",
    line_start: 10,
    line_end: 10,
    title: "t",
    description: "d",
    suggestion: "s",
    category: "SECURITY",
    status: "OPEN",
    ...partial,
  };
}

type MockEditorApi = {
  instance: EditorInstance;
  deltaDecorations: jest.Mock;
  revealLineInCenterIfOutsideViewport: jest.Mock;
  fireMouseDown: (e: EditorMouseEvent) => void;
};

function createMockEditor(): MockEditorApi {
  let decCounter = 0;
  let mouseListener: ((e: EditorMouseEvent) => void) | null = null;
  const deltaDecorations = jest.fn(
    (_old: string[], next: EditorDecoration[]) =>
      next.map(() => `d-${++decCounter}`),
  );
  const revealLineInCenterIfOutsideViewport = jest.fn();
  const onMouseDown = jest.fn((listener: (e: EditorMouseEvent) => void) => {
    mouseListener = listener;
    return { dispose: jest.fn() };
  });

  const instance: EditorInstance = {
    executeEdits: jest.fn(),
    trigger: jest.fn(),
    getModel: () => ({ getValue: () => "code" }),
    deltaDecorations,
    revealLineInCenterIfOutsideViewport,
    onMouseDown,
    onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
  };

  return {
    instance,
    deltaDecorations,
    revealLineInCenterIfOutsideViewport,
    fireMouseDown: (e) => mouseListener?.(e),
  };
}

function BidirectionalHarness({
  mock,
  seed,
}: {
  mock: MockEditorApi;
  seed: SessionAlert[];
}) {
  const editor = useEditor({ content: "line\n".repeat(80) });
  const session = useAlerts();
  const seeded = useRef(false);

  const { registerEditor, getEditor, editorGeneration, content } = editor;
  const {
    alerts,
    filteredAlerts,
    visibleSeverities,
    activeId,
    openCount,
    ingest,
    toggleFilter,
    selectAlert,
  } = session;

  useEffect(() => {
    registerEditor(mock.instance);
    return () => registerEditor(null);
  }, [registerEditor, mock.instance]);

  useEffect(() => {
    if (seeded.current) {
      return;
    }
    seeded.current = true;
    for (const a of seed) {
      ingest({
        event: "alert",
        data: {
          id: a.id,
          file: a.file,
          line_start: a.line_start,
          line_end: a.line_end,
          severity: a.severity,
          title: a.title,
          description: a.description,
          suggestion: a.suggestion,
          category: a.category,
        },
      });
    }
  }, [ingest, seed]);

  const highlight = useEditorHighlight({
    getEditor,
    editorGeneration,
    alerts,
    visibleSeverities,
    content,
    onGutterSelect: selectAlert,
  });

  return (
    <div>
      <SeverityFilters
        visibleSeverities={visibleSeverities}
        openCount={openCount}
        onToggle={toggleFilter}
      />
      <AlertPanel
        alerts={filteredAlerts}
        activeId={activeId}
        onSelect={(id) => {
          selectAlert(id);
          highlight.focusAlert(id);
        }}
      />
    </div>
  );
}

describe("BidirectionalNav", () => {
  it("clicking alert card triggers editor scroll (CA-RF03-02)", async () => {
    const mock = createMockEditor();
    const seed = [
      makeAlert({
        id: uuid(1),
        severity: "CRITICAL",
        line_start: 42,
        line_end: 42,
        title: "Critical find",
      }),
    ];

    render(<BidirectionalHarness mock={mock} seed={seed} />);

    const card = await screen.findByText("Critical find");
    fireEvent.click(card.closest("[data-testid='alert-card']")!);

    expect(mock.revealLineInCenterIfOutsideViewport).toHaveBeenCalledWith(42);
    expect(
      screen.getByTestId("alert-card").getAttribute("data-active"),
    ).toBe("true");
  });

  it("clicking gutter highlights corresponding card (CA-RF03-04)", async () => {
    const mock = createMockEditor();
    Element.prototype.scrollIntoView = jest.fn();

    const seed = [
      makeAlert({
        id: uuid(2),
        severity: "HIGH",
        line_start: 15,
        line_end: 15,
        title: "High find",
      }),
    ];

    render(<BidirectionalHarness mock={mock} seed={seed} />);
    await screen.findByText("High find");

    act(() => {
      mock.fireMouseDown({
        target: { type: 2, position: { lineNumber: 15, column: 1 } },
      });
    });

    const card = screen.getByTestId("alert-card");
    expect(card.getAttribute("data-active")).toBe("true");
    expect(card.getAttribute("data-alert-id")).toBe(uuid(2));
  });

  it("disabling MEDIUM removes MEDIUM gutters (CT06 / CA-RF08-04)", async () => {
    const mock = createMockEditor();
    const seed = [
      makeAlert({
        id: uuid(3),
        severity: "CRITICAL",
        line_start: 1,
        line_end: 1,
        title: "Crit",
      }),
      makeAlert({
        id: uuid(4),
        severity: "MEDIUM",
        line_start: 3,
        line_end: 3,
        title: "Med",
      }),
    ];

    render(<BidirectionalHarness mock={mock} seed={seed} />);
    await screen.findByText("Med");

    fireEvent.click(screen.getByRole("button", { name: /MEDIUM/i }));

    expect(screen.queryByText("Med")).not.toBeInTheDocument();
    expect(screen.getByText("Crit")).toBeInTheDocument();

    const lastCall =
      mock.deltaDecorations.mock.calls[
        mock.deltaDecorations.mock.calls.length - 1
      ];
    const next = lastCall?.[1] as EditorDecoration[];
    expect(next).toHaveLength(1);
    expect(next[0]?.options.glyphMarginClassName).toBe("acr-glyph-critical");
    expect(
      next.some(
        (d) => d.options.glyphMarginClassName === "acr-glyph-medium",
      ),
    ).toBe(false);
  });

  it("only one card is active at a time (CA-RF03-05)", async () => {
    const mock = createMockEditor();
    const seed = [
      makeAlert({
        id: uuid(5),
        severity: "HIGH",
        line_start: 1,
        line_end: 1,
        title: "First",
      }),
      makeAlert({
        id: uuid(6),
        severity: "LOW",
        line_start: 5,
        line_end: 5,
        title: "Second",
      }),
    ];

    render(<BidirectionalHarness mock={mock} seed={seed} />);
    await screen.findByText("First");

    fireEvent.click(
      screen.getByText("First").closest("[data-testid='alert-card']")!,
    );
    fireEvent.click(
      screen.getByText("Second").closest("[data-testid='alert-card']")!,
    );

    const cards = screen.getAllByTestId("alert-card");
    const active = cards.filter((c) => c.getAttribute("data-active") === "true");
    expect(active).toHaveLength(1);
    expect(within(active[0]!).getByText("Second")).toBeInTheDocument();
  });
});

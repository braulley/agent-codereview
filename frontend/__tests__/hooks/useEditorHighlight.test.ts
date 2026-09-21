import { act, renderHook } from "@testing-library/react";
import {
  TEMP_HIGHLIGHT_MS,
  useEditorHighlight,
} from "@/hooks/useEditorHighlight";
import type {
  EditorDecoration,
  EditorInstance,
  EditorMouseEvent,
} from "@/hooks/useEditor";
import type { SessionAlert } from "@/hooks/useAlerts";
import type { Severity } from "@/types/alert";

function alert(
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

function createMockEditor() {
  let decCounter = 0;
  let mouseListener: ((e: EditorMouseEvent) => void) | null = null;
  const deltaDecorations = jest.fn(
    (_old: string[], next: EditorDecoration[]) =>
      next.map(() => `d-${++decCounter}`),
  );
  const revealLineInCenterIfOutsideViewport = jest.fn();
  const dispose = jest.fn();
  const onMouseDown = jest.fn((listener: (e: EditorMouseEvent) => void) => {
    mouseListener = listener;
    return { dispose };
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
    onMouseDown,
    dispose,
    fireMouseDown: (e: EditorMouseEvent) => mouseListener?.(e),
  };
}

describe("useEditorHighlight", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sync applies decoration for OPEN visible alerts (CA-RF08-01)", () => {
    const mock = createMockEditor();
    const alerts = [
      alert({ id: "c1", severity: "CRITICAL", line_start: 12, line_end: 12 }),
    ];
    const visible = new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

    renderHook(() =>
      useEditorHighlight({
        getEditor: () => mock.instance,
        editorGeneration: 1,
        alerts,
        visibleSeverities: visible,
        content: "x",
        onGutterSelect: jest.fn(),
      }),
    );

    expect(mock.deltaDecorations).toHaveBeenCalled();
    const lastCall =
      mock.deltaDecorations.mock.calls[mock.deltaDecorations.mock.calls.length - 1];
    const next = lastCall?.[1] as EditorDecoration[];
    expect(next).toHaveLength(1);
    expect(next[0]?.range.startLineNumber).toBe(12);
    expect(next[0]?.options.glyphMarginClassName).toBe("acr-glyph-critical");
  });

  it("focusAlert reveals line and temp highlight clears after 2–3s (CA-RF03-03)", () => {
    const mock = createMockEditor();
    const alerts = [
      alert({ id: "a1", severity: "HIGH", line_start: 42, line_end: 42 }),
    ];
    const visible = new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

    const { result } = renderHook(() =>
      useEditorHighlight({
        getEditor: () => mock.instance,
        editorGeneration: 1,
        alerts,
        visibleSeverities: visible,
        content: "line\n".repeat(50),
        onGutterSelect: jest.fn(),
      }),
    );

    act(() => {
      result.current.focusAlert("a1");
    });

    expect(mock.revealLineInCenterIfOutsideViewport).toHaveBeenCalledWith(42);
    const afterFocusCalls = mock.deltaDecorations.mock.calls.length;

    act(() => {
      jest.advanceTimersByTime(TEMP_HIGHLIGHT_MS);
    });

    expect(mock.deltaDecorations.mock.calls.length).toBeGreaterThan(
      afterFocusCalls,
    );
    const clearCall =
      mock.deltaDecorations.mock.calls[mock.deltaDecorations.mock.calls.length - 1];
    expect(clearCall?.[1]).toEqual([]);
  });

  it("new focusAlert cancels previous temp timer (CA-RF03-05 prep)", () => {
    const mock = createMockEditor();
    const alerts = [
      alert({ id: "a", severity: "HIGH", line_start: 1, line_end: 1 }),
      alert({ id: "b", severity: "LOW", line_start: 5, line_end: 5 }),
    ];
    const visible = new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

    const { result } = renderHook(() =>
      useEditorHighlight({
        getEditor: () => mock.instance,
        editorGeneration: 1,
        alerts,
        visibleSeverities: visible,
        content: "x",
        onGutterSelect: jest.fn(),
      }),
    );

    act(() => {
      result.current.focusAlert("a");
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      result.current.focusAlert("b");
    });

    const revealCalls = mock.revealLineInCenterIfOutsideViewport.mock.calls;
    expect(revealCalls[revealCalls.length - 1]?.[0]).toBe(5);
  });

  it("clearHighlight removes decoration for that alert (CA-RF08-03)", () => {
    const mock = createMockEditor();
    const alerts = [
      alert({ id: "keep", severity: "CRITICAL", line_start: 1, line_end: 1 }),
      alert({ id: "drop", severity: "HIGH", line_start: 2, line_end: 2 }),
    ];
    const visible = new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

    const { result } = renderHook(() =>
      useEditorHighlight({
        getEditor: () => mock.instance,
        editorGeneration: 1,
        alerts,
        visibleSeverities: visible,
        content: "x",
        onGutterSelect: jest.fn(),
      }),
    );

    act(() => {
      result.current.clearHighlight("drop");
    });

    const lastCall =
      mock.deltaDecorations.mock.calls[mock.deltaDecorations.mock.calls.length - 1];
    const next = lastCall?.[1] as EditorDecoration[];
    expect(next).toHaveLength(1);
    expect(next[0]?.range.startLineNumber).toBe(1);
  });

  it("filter change removes gutters for hidden severity (CA-RF08-04)", () => {
    const mock = createMockEditor();
    const alerts = [
      alert({ id: "c", severity: "CRITICAL", line_start: 1, line_end: 1 }),
      alert({ id: "m", severity: "MEDIUM", line_start: 3, line_end: 3 }),
    ];

    const { rerender } = renderHook(
      ({ visible }: { visible: Set<Severity> }) =>
        useEditorHighlight({
          getEditor: () => mock.instance,
          editorGeneration: 1,
          alerts,
          visibleSeverities: visible,
          content: "x",
          onGutterSelect: jest.fn(),
        }),
      {
        initialProps: {
          visible: new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
        },
      },
    );

    act(() => {
      rerender({
        visible: new Set<Severity>(["CRITICAL", "HIGH", "LOW"]),
      });
    });

    const lastCall =
      mock.deltaDecorations.mock.calls[mock.deltaDecorations.mock.calls.length - 1];
    const next = lastCall?.[1] as EditorDecoration[];
    expect(next).toHaveLength(1);
    expect(next[0]?.options.glyphMarginClassName).toBe("acr-glyph-critical");
  });

  it("gutter click invokes onGutterSelect (CA-RF03-04)", () => {
    const mock = createMockEditor();
    const onGutterSelect = jest.fn();
    const alerts = [
      alert({ id: "g1", severity: "CRITICAL", line_start: 7, line_end: 7 }),
    ];
    const visible = new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

    renderHook(() =>
      useEditorHighlight({
        getEditor: () => mock.instance,
        editorGeneration: 1,
        alerts,
        visibleSeverities: visible,
        content: "x",
        onGutterSelect,
      }),
    );

    act(() => {
      mock.fireMouseDown({
        target: { type: 2, position: { lineNumber: 7, column: 1 } },
      });
    });

    expect(onGutterSelect).toHaveBeenCalledWith("g1");
  });
});

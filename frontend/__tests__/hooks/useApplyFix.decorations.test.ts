import { act, renderHook } from "@testing-library/react";
import {
  type ApplyEditInput,
  type EditorInstance,
} from "@/hooks/useEditor";
import { useApplyFix } from "@/hooks/useApplyFix";
import type { SessionAlert } from "@/hooks/useAlerts";

const ID_A = "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0a";
const ID_B = "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0b";

function alertAt(
  id: string,
  line: number,
  status: SessionAlert["status"] = "OPEN",
): SessionAlert {
  return {
    id,
    file: "a.py",
    line_start: line,
    line_end: line,
    severity: "CRITICAL",
    title: "t",
    description: "d",
    suggestion: `fix-${id}`,
    category: "SECURITY",
    status,
  };
}

function createMockEditor(initial: string) {
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
      const before = lines.slice(0, start);
      const after = lines.slice(end + 1);
      value = [...before, ...edit.text.split("\n"), ...after].join("\n");
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
    getValue: () => value,
    setValue: (next: string) => {
      value = next;
      contentListener?.();
    },
  };
}

describe("useApplyFix decorations (CA-RF08-03)", () => {
  it("apply clears highlight for id; undo restores; other id untouched", () => {
    const original = ["L1", "L2", "bad-a", "L4", "bad-b"].join("\n");
    const mock = createMockEditor(original);
    const clearHighlight = jest.fn();
    const restoreHighlight = jest.fn();
    const applyEdit = jest.fn((edit: ApplyEditInput, source?: string) => {
      mock.instance.executeEdits(source ?? "t", [edit]);
    });

    const { result } = renderHook(() =>
      useApplyFix({
        getEditor: () => mock.instance,
        getContent: () => mock.getValue(),
        applyEdit,
        resolveAlert: jest.fn(),
        unresolveAlert: jest.fn(),
        clearHighlight,
        restoreHighlight,
        editorGeneration: 1,
      }),
    );

    act(() => {
      result.current.applyFix(alertAt(ID_A, 3));
    });

    expect(clearHighlight).toHaveBeenCalledTimes(1);
    expect(clearHighlight).toHaveBeenCalledWith(ID_A);
    expect(clearHighlight).not.toHaveBeenCalledWith(ID_B);
    expect(restoreHighlight).not.toHaveBeenCalled();

    act(() => {
      mock.setValue(original);
    });

    expect(restoreHighlight).toHaveBeenCalledTimes(1);
    expect(restoreHighlight).toHaveBeenCalledWith(ID_A);
    expect(restoreHighlight).not.toHaveBeenCalledWith(ID_B);
  });
});

import { act, renderHook } from "@testing-library/react";
import {
  APPLY_FIX_EDIT_SOURCE,
  type ApplyEditInput,
  type EditorInstance,
} from "@/hooks/useEditor";
import { useApplyFix } from "@/hooks/useApplyFix";
import type { SessionAlert } from "@/hooks/useAlerts";

const CT01_ID = "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c";
const OTHER_ID = "b4e9d3f2-5e6c-4f3a-9b2d-0c8e4f7a3b1d";

const BAD_LINE =
  '    cursor.execute("SELECT * FROM users WHERE id = " + user_input)';
const SUGGESTION =
  "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))";

function makeContent(line12: string): string {
  const lines = Array.from({ length: 13 }, (_, i) =>
    i === 11 ? line12 : `line-${i + 1}`,
  );
  return lines.join("\n");
}

function ct01Alert(status: SessionAlert["status"] = "OPEN"): SessionAlert {
  return {
    id: CT01_ID,
    file: "users.py",
    line_start: 12,
    line_end: 12,
    severity: "CRITICAL",
    title: "SQL Injection via concatenação direta de input",
    description: "A query SQL é construída por concatenação direta.",
    suggestion: SUGGESTION,
    category: "SECURITY",
    status,
  };
}

function otherAlert(): SessionAlert {
  return {
    id: OTHER_ID,
    file: "other.py",
    line_start: 3,
    line_end: 3,
    severity: "HIGH",
    title: "Other",
    description: "d",
    suggestion: "fixed",
    category: "QUALITY",
    status: "OPEN",
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
      const replacement = edit.text.split("\n");
      value = [...before, ...replacement, ...after].join("\n");
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
      return { dispose: () => {
        contentListener = null;
      } };
    }),
  };

  return {
    instance,
    executeEdits,
    getValue: () => value,
    setValue: (next: string) => {
      value = next;
      contentListener?.();
    },
    fireContentChange: () => contentListener?.(),
  };
}

describe("useApplyFix", () => {
  it("apply calls executeEdits with range+suggestion (CA-RF04-01)", () => {
    const content = makeContent(BAD_LINE);
    const mock = createMockEditor(content);
    const resolveAlert = jest.fn();
    const unresolveAlert = jest.fn();
    const clearHighlight = jest.fn();
    const restoreHighlight = jest.fn();
    const applyEdit = jest.fn((edit: ApplyEditInput, source?: string) => {
      mock.instance.executeEdits(source ?? "test", [edit]);
    });

    const { result } = renderHook(() =>
      useApplyFix({
        getEditor: () => mock.instance,
        getContent: () => mock.getValue(),
        applyEdit,
        resolveAlert,
        unresolveAlert,
        clearHighlight,
        restoreHighlight,
        editorGeneration: 1,
      }),
    );

    act(() => {
      result.current.applyFix(ct01Alert());
    });

    expect(applyEdit).toHaveBeenCalledTimes(1);
    const [edit, source] = applyEdit.mock.calls[0] as [
      ApplyEditInput,
      string | undefined,
    ];
    expect(source).toBe(APPLY_FIX_EDIT_SOURCE);
    expect(edit.text).toBe(SUGGESTION);
    expect(edit.range.startLineNumber).toBe(12);
    expect(edit.range.endLineNumber).toBe(12);
    expect(mock.executeEdits).toHaveBeenCalledWith(
      APPLY_FIX_EDIT_SOURCE,
      expect.any(Array),
    );
    expect(resolveAlert).toHaveBeenCalledTimes(1);
    expect(resolveAlert).toHaveBeenCalledWith(CT01_ID);
    expect(clearHighlight).toHaveBeenCalledTimes(1);
    expect(clearHighlight).toHaveBeenCalledWith(CT01_ID);
  });

  it("second alert stays intact (CA-RF04-02)", () => {
    const content = makeContent(BAD_LINE);
    const mock = createMockEditor(content);
    const resolveAlert = jest.fn();
    const applyEdit = jest.fn((edit: ApplyEditInput, source?: string) => {
      mock.instance.executeEdits(source ?? "test", [edit]);
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

    act(() => {
      result.current.applyFix(ct01Alert());
    });

    expect(resolveAlert).toHaveBeenCalledWith(CT01_ID);
    expect(resolveAlert).not.toHaveBeenCalledWith(OTHER_ID);
    expect(otherAlert().status).toBe("OPEN");
  });

  it("content revert → unresolveAlert (CA-RF04-04)", () => {
    const content = makeContent(BAD_LINE);
    const mock = createMockEditor(content);
    const resolveAlert = jest.fn();
    const unresolveAlert = jest.fn();
    const restoreHighlight = jest.fn();
    const applyEdit = jest.fn((edit: ApplyEditInput, source?: string) => {
      mock.instance.executeEdits(source ?? "test", [edit]);
    });

    const { result } = renderHook(() =>
      useApplyFix({
        getEditor: () => mock.instance,
        getContent: () => mock.getValue(),
        applyEdit,
        resolveAlert,
        unresolveAlert,
        clearHighlight: jest.fn(),
        restoreHighlight,
        editorGeneration: 1,
      }),
    );

    act(() => {
      result.current.applyFix(ct01Alert());
    });
    expect(resolveAlert).toHaveBeenCalledTimes(1);

    act(() => {
      mock.setValue(content);
    });

    expect(unresolveAlert).toHaveBeenCalledTimes(1);
    expect(unresolveAlert).toHaveBeenCalledWith(CT01_ID);
    expect(restoreHighlight).toHaveBeenCalledTimes(1);
    expect(restoreHighlight).toHaveBeenCalledWith(CT01_ID);
  });

  it("manual undo without apply does not call resolveAlert", () => {
    const content = makeContent(BAD_LINE);
    const mock = createMockEditor(content);
    const resolveAlert = jest.fn();
    const unresolveAlert = jest.fn();

    renderHook(() =>
      useApplyFix({
        getEditor: () => mock.instance,
        getContent: () => mock.getValue(),
        applyEdit: jest.fn(),
        resolveAlert,
        unresolveAlert,
        clearHighlight: jest.fn(),
        restoreHighlight: jest.fn(),
        editorGeneration: 1,
      }),
    );

    act(() => {
      mock.setValue(makeContent("edited"));
      mock.setValue(content);
    });

    expect(resolveAlert).not.toHaveBeenCalled();
    expect(unresolveAlert).not.toHaveBeenCalled();
  });

  it("guards when editor is not registered", () => {
    const onEditorNotReady = jest.fn();
    const applyEdit = jest.fn();
    const resolveAlert = jest.fn();

    const { result } = renderHook(() =>
      useApplyFix({
        getEditor: () => null,
        getContent: () => makeContent(BAD_LINE),
        applyEdit,
        resolveAlert,
        unresolveAlert: jest.fn(),
        clearHighlight: jest.fn(),
        restoreHighlight: jest.fn(),
        editorGeneration: 0,
        onEditorNotReady,
      }),
    );

    act(() => {
      result.current.applyFix(ct01Alert());
    });

    expect(onEditorNotReady).toHaveBeenCalledTimes(1);
    expect(applyEdit).not.toHaveBeenCalled();
    expect(resolveAlert).not.toHaveBeenCalled();
  });
});

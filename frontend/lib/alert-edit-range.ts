import type { ApplyEditInput } from "@/hooks/useEditor";

export type AlertEditRangeOk = {
  ok: true;
  edit: ApplyEditInput;
  beforeSnippet: string;
};

export type AlertEditRangeErr = {
  ok: false;
  reason: "out_of_range" | "invalid_span";
};

export type AlertEditRangeResult = AlertEditRangeOk | AlertEditRangeErr;

/**
 * Map 1-based inclusive alert lines + model text → Monaco executeEdits range.
 * Pure: no editor instance, no network.
 */
export function alertToEditRange(
  content: string,
  lineStart: number,
  lineEnd: number,
  replacement: string,
): AlertEditRangeResult {
  if (
    !Number.isInteger(lineStart) ||
    !Number.isInteger(lineEnd) ||
    lineStart < 1 ||
    lineEnd < lineStart
  ) {
    return { ok: false, reason: "invalid_span" };
  }

  const lines = content.split("\n");
  if (lineEnd > lines.length) {
    return { ok: false, reason: "out_of_range" };
  }

  const slice = lines.slice(lineStart - 1, lineEnd);
  const beforeSnippet = slice.join("\n");
  const endLineText = lines[lineEnd - 1] ?? "";

  return {
    ok: true,
    beforeSnippet,
    edit: {
      range: {
        startLineNumber: lineStart,
        startColumn: 1,
        endLineNumber: lineEnd,
        endColumn: endLineText.length + 1,
      },
      text: replacement,
    },
  };
}

/** Extract current snippet at the same 1-based inclusive lines (for undo sync). */
export function extractSnippet(
  content: string,
  lineStart: number,
  lineEnd: number,
): string | null {
  if (
    !Number.isInteger(lineStart) ||
    !Number.isInteger(lineEnd) ||
    lineStart < 1 ||
    lineEnd < lineStart
  ) {
    return null;
  }
  const lines = content.split("\n");
  if (lineEnd > lines.length) {
    return null;
  }
  return lines.slice(lineStart - 1, lineEnd).join("\n");
}

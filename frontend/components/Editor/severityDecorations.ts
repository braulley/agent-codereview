import type { Severity } from "@/types/alert";

/** RF08 normative gutter colors (CA-RF08-02). */
export const SEVERITY_GUTTER_COLOR: Record<Severity, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#EAB308",
  LOW: "#3B82F6",
};

/** RF08 normative background highlight colors. */
export const SEVERITY_HIGHLIGHT_COLOR: Record<Severity, string> = {
  CRITICAL: "rgba(239,68,68,0.15)",
  HIGH: "rgba(249,115,22,0.15)",
  MEDIUM: "rgba(234,179,8,0.12)",
  LOW: "rgba(59,130,246,0.10)",
};

export const SEVERITY_COLORS: Record<
  Severity,
  { gutter: string; highlight: string }
> = {
  CRITICAL: {
    gutter: SEVERITY_GUTTER_COLOR.CRITICAL,
    highlight: SEVERITY_HIGHLIGHT_COLOR.CRITICAL,
  },
  HIGH: {
    gutter: SEVERITY_GUTTER_COLOR.HIGH,
    highlight: SEVERITY_HIGHLIGHT_COLOR.HIGH,
  },
  MEDIUM: {
    gutter: SEVERITY_GUTTER_COLOR.MEDIUM,
    highlight: SEVERITY_HIGHLIGHT_COLOR.MEDIUM,
  },
  LOW: {
    gutter: SEVERITY_GUTTER_COLOR.LOW,
    highlight: SEVERITY_HIGHLIGHT_COLOR.LOW,
  },
};

export function severityClassNames(severity: Severity): {
  gutter: string;
  glyph: string;
  highlight: string;
  temp: string;
} {
  const key = severity.toLowerCase();
  return {
    gutter: `acr-gutter-${key}`,
    glyph: `acr-glyph-${key}`,
    highlight: `acr-hl-${key}`,
    temp: `acr-hl-temp-${key}`,
  };
}

export function lineRange(
  lineStart: number,
  lineEnd: number,
): {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
} {
  return {
    startLineNumber: lineStart,
    startColumn: 1,
    endLineNumber: lineEnd,
    endColumn: 1,
  };
}

export function persistentDecorationOptions(severity: Severity): Record<
  string,
  unknown
> {
  const classes = severityClassNames(severity);
  return {
    isWholeLine: true,
    className: classes.highlight,
    glyphMarginClassName: classes.glyph,
    linesDecorationsClassName: classes.gutter,
  };
}

export function temporaryDecorationOptions(severity: Severity): Record<
  string,
  unknown
> {
  const classes = severityClassNames(severity);
  return {
    isWholeLine: true,
    className: classes.temp,
  };
}

/**
 * Monaco MouseTargetType:
 * GUTTER_GLYPH_MARGIN = 2, GUTTER_LINE_DECORATIONS = 4
 */
export function isGutterMouseTarget(type: number | string | undefined): boolean {
  return type === 2 || type === 4 || type === "GUTTER_GLYPH_MARGIN";
}

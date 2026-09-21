import {
  SEVERITY_GUTTER_COLOR,
  SEVERITY_HIGHLIGHT_COLOR,
  persistentDecorationOptions,
  severityClassNames,
  temporaryDecorationOptions,
} from "@/components/Editor/severityDecorations";
import type { Severity } from "@/types/alert";

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

describe("severityDecorations (CA-RF08-02)", () => {
  it("maps four severities to RF08 gutter and highlight colors", () => {
    expect(SEVERITY_GUTTER_COLOR.CRITICAL).toBe("#EF4444");
    expect(SEVERITY_HIGHLIGHT_COLOR.CRITICAL).toBe("rgba(239,68,68,0.15)");
    expect(SEVERITY_GUTTER_COLOR.HIGH).toBe("#F97316");
    expect(SEVERITY_HIGHLIGHT_COLOR.HIGH).toBe("rgba(249,115,22,0.15)");
    expect(SEVERITY_GUTTER_COLOR.MEDIUM).toBe("#EAB308");
    expect(SEVERITY_HIGHLIGHT_COLOR.MEDIUM).toBe("rgba(234,179,8,0.12)");
    expect(SEVERITY_GUTTER_COLOR.LOW).toBe("#3B82F6");
    expect(SEVERITY_HIGHLIGHT_COLOR.LOW).toBe("rgba(59,130,246,0.10)");
  });

  it("exposes distinct classNames for each severity", () => {
    const classes = SEVERITIES.map((s) => severityClassNames(s));
    const glyphs = new Set(classes.map((c) => c.glyph));
    const gutters = new Set(classes.map((c) => c.gutter));
    expect(glyphs.size).toBe(4);
    expect(gutters.size).toBe(4);
  });

  it("persistent options include whole-line + gutter classes", () => {
    const opts = persistentDecorationOptions("CRITICAL");
    expect(opts.isWholeLine).toBe(true);
    expect(opts.className).toBe("acr-hl-critical");
    expect(opts.glyphMarginClassName).toBe("acr-glyph-critical");
    expect(opts.linesDecorationsClassName).toBe("acr-gutter-critical");
  });

  it("temporary options use temp class without glyph", () => {
    const opts = temporaryDecorationOptions("HIGH");
    expect(opts.isWholeLine).toBe(true);
    expect(opts.className).toBe("acr-hl-temp-high");
    expect("glyphMarginClassName" in opts).toBe(false);
  });
});

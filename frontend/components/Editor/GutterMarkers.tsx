/**
 * Factory/CSS map for Monaco severity decorations (RF08).
 * Pure helpers live in severityDecorations — this module re-exports the public surface.
 */
export {
  SEVERITY_GUTTER_COLOR,
  SEVERITY_HIGHLIGHT_COLOR,
  isGutterMouseTarget,
  lineRange,
  persistentDecorationOptions,
  severityClassNames,
  temporaryDecorationOptions,
} from "./severityDecorations";

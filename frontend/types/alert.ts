/**
 * Alert contract mirrored from backend C03 / docs/spec.md §5 (snake_case SSE JSON).
 */

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type Category =
  | "SECURITY"
  | "PERFORMANCE"
  | "QUALITY"
  | "MAINTAINABILITY";

export type AlertStatus = "OPEN" | "RESOLVED";

export type AlertItem = {
  id: string;
  file: string;
  line_start: number;
  line_end: number;
  severity: Severity;
  title: string;
  description: string;
  suggestion: string;
  category: Category;
};

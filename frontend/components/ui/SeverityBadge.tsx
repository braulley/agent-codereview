import type { Severity } from "@/types/alert";

type SeverityBadgeProps = {
  severity: Severity;
};

const SEVERITY_CLASS: Record<Severity, string> = {
  CRITICAL: "bg-severity-critical/15 text-severity-critical border-severity-critical",
  HIGH: "bg-severity-high/15 text-severity-high border-severity-high",
  MEDIUM: "bg-severity-medium/15 text-severity-medium border-severity-medium",
  LOW: "bg-severity-low/15 text-severity-low border-severity-low",
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <span
      className={`font-mono inline-flex items-center rounded-none border px-2 py-0.5 text-xs uppercase tracking-wider ${SEVERITY_CLASS[severity]}`}
      data-severity={severity}
    >
      {severity}
    </span>
  );
}

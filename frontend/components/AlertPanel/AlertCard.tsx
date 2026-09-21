"use client";

import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import type { SessionAlert } from "@/hooks/useAlerts";
import type { Severity } from "@/types/alert";

const SEVERITY_BORDER: Record<Severity, string> = {
  CRITICAL: "border-l-severity-critical",
  HIGH: "border-l-severity-high",
  MEDIUM: "border-l-severity-medium",
  LOW: "border-l-severity-low",
};

export type AlertCardProps = {
  alert: SessionAlert;
  active?: boolean;
  onSelect?: (id: string) => void;
  onApplyFix?: (id: string) => void;
  applyDisabled?: boolean;
};

export function AlertCard({
  alert,
  active = false,
  onSelect,
  onApplyFix,
  applyDisabled = false,
}: AlertCardProps) {
  const resolved = alert.status === "RESOLVED";
  const lineLabel =
    alert.line_start === alert.line_end
      ? `L${alert.line_start}`
      : `L${alert.line_start}–${alert.line_end}`;

  return (
    <article
      data-testid="alert-card"
      data-alert-id={alert.id}
      data-status={alert.status}
      data-active={active ? "true" : "false"}
      className={[
        "rounded-none border border-hairline bg-surface-l1 border-l-[3px] p-3",
        SEVERITY_BORDER[alert.severity],
        active ? "border-beacon ring-1 ring-beacon" : "",
        resolved ? "opacity-60" : "",
      ].join(" ")}
      onClick={() => onSelect?.(alert.id)}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={alert.severity} />
        <span className="font-mono text-xs uppercase tracking-wider text-gray-400">
          [{alert.category}]
        </span>
        <span className="font-mono text-xs text-gray-500">{lineLabel}</span>
        {resolved ? (
          <span
            className="font-display ml-auto text-xs uppercase tracking-wide text-success"
            aria-label="Resolvido"
          >
            ✓ Resolvido
          </span>
        ) : null}
      </div>

      <h3 className="font-display mb-1 text-sm font-semibold text-gray-100">
        {alert.title}
      </h3>
      <p className="font-sans mb-1 text-xs text-gray-400">{alert.file}</p>
      <p className="font-sans mb-2 text-sm text-gray-300">{alert.description}</p>
      <pre className="font-mono mb-3 overflow-x-auto border border-hairline bg-surface-l2 p-2 text-xs text-gray-200">
        {alert.suggestion}
      </pre>

      <Button
        variant="primary"
        className="font-bold hover:border-white"
        disabled={resolved || applyDisabled}
        onClick={(e) => {
          e.stopPropagation();
          if (resolved || applyDisabled) {
            return;
          }
          onApplyFix?.(alert.id);
        }}
      >
        Aplicar Correção
      </Button>
    </article>
  );
}

"use client";

import type { Severity } from "@/types/alert";

const ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export type SeverityFiltersProps = {
  visibleSeverities: ReadonlySet<Severity>;
  openCount: Record<Severity, number>;
  onToggle: (severity: Severity) => void;
};

export function SeverityFilters({
  visibleSeverities,
  openCount,
  onToggle,
}: SeverityFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filtros de severidade"
      className="flex flex-wrap gap-2"
    >
      {ORDER.map((severity) => {
        const pressed = visibleSeverities.has(severity);
        const count = openCount[severity] ?? 0;
        return (
          <button
            key={severity}
            type="button"
            aria-pressed={pressed}
            onClick={() => onToggle(severity)}
            className={[
              "font-display rounded-none border px-2 py-1 text-xs uppercase tracking-wide",
              pressed
                ? "border-hairline-strong bg-surface-l2 text-gray-100"
                : "border-hairline bg-surface-l1 text-gray-400 opacity-50",
            ].join(" ")}
          >
            {severity}{" "}
            <span className="font-mono">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

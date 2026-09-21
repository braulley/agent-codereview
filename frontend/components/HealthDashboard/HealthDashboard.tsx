"use client";

import { calculateHealthScore, healthBand } from "@/lib/health-score";
import type { AlertStatus, Severity } from "@/types/alert";

export type HealthDashboardAlert = {
  severity: Severity;
  status?: AlertStatus;
};

export type HealthDashboardProps = {
  alerts: HealthDashboardAlert[];
};

const BAND_BAR: Record<string, string> = {
  EXCELLENT: "bg-success",
  GOOD: "bg-severity-medium",
  ATTENTION: "bg-severity-high",
  CRITICAL: "bg-severity-critical",
};

export function HealthDashboard({ alerts }: HealthDashboardProps) {
  const open = alerts.filter((a) => (a.status ?? "OPEN") === "OPEN");
  const { code_health_score, alert_count } = calculateHealthScore(open);
  const { band, color } = healthBand(code_health_score);

  return (
    <section
      aria-label="Code Health Score"
      className="rounded-none border border-hairline bg-surface-l1 p-4"
    >
      <p className="font-display mb-2 text-xs uppercase tracking-widest text-gray-500">
        Code Health
      </p>
      <p
        className="font-display text-[32px] font-bold leading-10 tracking-tight"
        style={{ color }}
        data-testid="health-score"
        data-band={band}
      >
        {code_health_score}
      </p>
      <p
        className="font-display mb-3 text-xs uppercase tracking-widest"
        style={{ color }}
        data-testid="health-band"
      >
        {band}
      </p>
      <div
        className="mb-4 h-2 w-full overflow-hidden rounded-none bg-surface-l2"
        role="meter"
        aria-valuenow={code_health_score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Health meter"
      >
        <div
          className={`h-full ${BAND_BAR[band] ?? "bg-success"}`}
          style={{ width: `${code_health_score}%` }}
        />
      </div>
      <ul className="font-mono space-y-1 text-xs text-gray-400">
        {(Object.keys(alert_count) as Severity[]).map((sev) => (
          <li key={sev} data-testid={`count-${sev}`}>
            {sev}: {alert_count[sev]}
          </li>
        ))}
      </ul>
    </section>
  );
}

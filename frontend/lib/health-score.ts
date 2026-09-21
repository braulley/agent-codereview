import type { Severity } from "@/types/alert";
import type { ScorePayload } from "@/types/analysis";

const WEIGHTS: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 10,
  MEDIUM: 3,
  LOW: 1,
};

export type HealthBand = "EXCELLENT" | "GOOD" | "ATTENTION" | "CRITICAL";

export type HealthBandResult = {
  band: HealthBand;
  color: string;
};

const BAND_COLORS: Record<HealthBand, string> = {
  EXCELLENT: "#10B981",
  GOOD: "#EAB308",
  ATTENTION: "#F97316",
  CRITICAL: "#EF4444",
};

/** Pure RF06 formula — identical to backend scorer. No I/O. */
export function calculateHealthScore(
  alerts: { severity: Severity }[],
): ScorePayload {
  const alert_count: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  for (const alert of alerts) {
    alert_count[alert.severity] += 1;
  }

  const penalty = (Object.keys(WEIGHTS) as Severity[]).reduce(
    (sum, sev) => sum + alert_count[sev] * WEIGHTS[sev],
    0,
  );

  return {
    code_health_score: Math.max(0, 100 - penalty),
    alert_count,
  };
}

/** Canonical visual band cuts: 91 / 71 / 41. */
export function healthBand(score: number): HealthBandResult {
  let band: HealthBand;
  if (score >= 91) {
    band = "EXCELLENT";
  } else if (score >= 71) {
    band = "GOOD";
  } else if (score >= 41) {
    band = "ATTENTION";
  } else {
    band = "CRITICAL";
  }
  return { band, color: BAND_COLORS[band] };
}

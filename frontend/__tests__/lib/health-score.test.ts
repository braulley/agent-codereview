import { calculateHealthScore, healthBand } from "@/lib/health-score";
import type { Severity } from "@/types/alert";

function alerts(...severities: Severity[]) {
  return severities.map((severity) => ({ severity }));
}

describe("calculateHealthScore", () => {
  it("returns 100 and zero counts for empty list (CT03 / CA-RF06-03)", () => {
    expect(calculateHealthScore([])).toEqual({
      code_health_score: 100,
      alert_count: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    });
  });

  it("subtracts 25 for one CRITICAL", () => {
    expect(calculateHealthScore(alerts("CRITICAL"))).toEqual({
      code_health_score: 75,
      alert_count: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
    });
  });

  it("applies mixed weights 1C+2H+1M+3L → 49", () => {
    expect(
      calculateHealthScore(
        alerts("CRITICAL", "HIGH", "HIGH", "MEDIUM", "LOW", "LOW", "LOW"),
      ),
    ).toEqual({
      code_health_score: 49,
      alert_count: { CRITICAL: 1, HIGH: 2, MEDIUM: 1, LOW: 3 },
    });
  });

  it("clamps at 0 for ≥4 CRITICAL", () => {
    expect(
      calculateHealthScore(alerts("CRITICAL", "CRITICAL", "CRITICAL", "CRITICAL")),
    ).toEqual({
      code_health_score: 0,
      alert_count: { CRITICAL: 4, HIGH: 0, MEDIUM: 0, LOW: 0 },
    });
  });
});

describe("healthBand", () => {
  it("maps 100 to EXCELLENT", () => {
    expect(healthBand(100)).toEqual({ band: "EXCELLENT", color: "#10B981" });
  });

  it("maps 47 to ATTENTION", () => {
    expect(healthBand(47)).toEqual({ band: "ATTENTION", color: "#F97316" });
  });

  it("maps 0 to CRITICAL", () => {
    expect(healthBand(0)).toEqual({ band: "CRITICAL", color: "#EF4444" });
  });
});

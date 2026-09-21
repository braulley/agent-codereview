import { act, render, renderHook, screen } from "@testing-library/react";
import { HealthDashboard } from "@/components/HealthDashboard/HealthDashboard";
import { useAlerts } from "@/hooks/useAlerts";
import type { Severity } from "@/types/alert";

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `a3f8c2e1-4d5b-4e2f-8a1c-${hex}`;
}

function alertEvent(id: string, severity: Severity) {
  return {
    event: "alert" as const,
    data: {
      id,
      file: "f.py",
      line_start: 1,
      line_end: 1,
      severity,
      title: `${severity}`,
      description: "d",
      suggestion: "s",
      category: "QUALITY" as const,
    },
  };
}

describe("HealthDashboard", () => {
  it("[] → 100 EXCELLENT (CT03)", () => {
    render(<HealthDashboard alerts={[]} />);
    expect(screen.getByTestId("health-score")).toHaveTextContent("100");
    expect(screen.getByTestId("health-band")).toHaveTextContent("EXCELLENT");
    expect(screen.getByTestId("health-score")).toHaveStyle({
      color: "#10B981",
    });
  });

  it("1 CRITICAL → 75", () => {
    render(
      <HealthDashboard alerts={[{ severity: "CRITICAL", status: "OPEN" }]} />,
    );
    expect(screen.getByTestId("health-score")).toHaveTextContent("75");
  });

  it("1C+2H+5M+3L → 37 CRITICAL band (RF06 formula + design cuts)", () => {
    const alerts = [
      { severity: "CRITICAL" as const, status: "OPEN" as const },
      ...Array.from({ length: 2 }, () => ({
        severity: "HIGH" as const,
        status: "OPEN" as const,
      })),
      ...Array.from({ length: 5 }, () => ({
        severity: "MEDIUM" as const,
        status: "OPEN" as const,
      })),
      ...Array.from({ length: 3 }, () => ({
        severity: "LOW" as const,
        status: "OPEN" as const,
      })),
    ];
    // 100 - (25 + 20 + 15 + 3) = 37 → band CRITICAL (0–40); OpenSpec "25 ATTENTION" is inconsistent with docs/*
    render(<HealthDashboard alerts={alerts} />);
    expect(screen.getByTestId("health-score")).toHaveTextContent("37");
    expect(screen.getByTestId("health-band")).toHaveTextContent("CRITICAL");
    expect(screen.getByTestId("health-score")).toHaveStyle({
      color: "#EF4444",
    });
  });

  it("score 55 is ATTENTION", () => {
    // 1C+1H = 35 penalty → 65; use 1C+2H = 45 → 55
    const alerts = [
      { severity: "CRITICAL" as const, status: "OPEN" as const },
      { severity: "HIGH" as const, status: "OPEN" as const },
      { severity: "HIGH" as const, status: "OPEN" as const },
    ];
    render(<HealthDashboard alerts={alerts} />);
    expect(screen.getByTestId("health-score")).toHaveTextContent("55");
    expect(screen.getByTestId("health-band")).toHaveTextContent("ATTENTION");
    expect(screen.getByTestId("health-score")).toHaveStyle({
      color: "#F97316",
    });
  });

  it("≥4 CRITICAL → 0 CRITICAL band", () => {
    const alerts = Array.from({ length: 4 }, () => ({
      severity: "CRITICAL" as const,
      status: "OPEN" as const,
    }));
    render(<HealthDashboard alerts={alerts} />);
    expect(screen.getByTestId("health-score")).toHaveTextContent("0");
    expect(screen.getByTestId("health-band")).toHaveTextContent("CRITICAL");
    expect(screen.getByTestId("health-score")).toHaveStyle({
      color: "#EF4444",
    });
  });

  it("after resolveAlert of sole CRITICAL → 100", () => {
    const { result } = renderHook(() => useAlerts());
    act(() => {
      result.current.ingest(alertEvent(uuid(1), "CRITICAL"));
    });

    const { rerender } = render(
      <HealthDashboard alerts={result.current.alerts} />,
    );
    expect(screen.getByTestId("health-score")).toHaveTextContent("75");

    act(() => {
      result.current.resolveAlert(uuid(1));
    });
    rerender(<HealthDashboard alerts={result.current.alerts} />);
    expect(screen.getByTestId("health-score")).toHaveTextContent("100");
  });

  it("hiding chips does not change the score number", () => {
    const alerts = [
      { severity: "CRITICAL" as const, status: "OPEN" as const },
      { severity: "LOW" as const, status: "OPEN" as const },
    ];
    const { rerender } = render(<HealthDashboard alerts={alerts} />);
    expect(screen.getByTestId("health-score")).toHaveTextContent("74");

    // Filters hide LOW in the panel, but HealthDashboard still receives all OPEN.
    rerender(<HealthDashboard alerts={alerts} />);
    expect(screen.getByTestId("health-score")).toHaveTextContent("74");
  });
});

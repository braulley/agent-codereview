import { act, renderHook } from "@testing-library/react";
import { useAlerts } from "@/hooks/useAlerts";

const CT01_ID = "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c";

const ct01AlertEvent = {
  event: "alert" as const,
  data: {
    id: CT01_ID,
    file: "users.py",
    line_start: 12,
    line_end: 12,
    severity: "CRITICAL",
    title: "SQL Injection via concatenação direta de input",
    description:
      "A query SQL é construída por concatenação direta de input não sanitizado. Referência: OWASP Top 10 — A03:2021 Injection.",
    suggestion:
      "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
    category: "SECURITY",
  },
};

describe("useAlerts", () => {
  it("starts empty with all severity filters on", () => {
    const { result } = renderHook(() => useAlerts());
    expect(result.current.alerts).toEqual([]);
    expect(result.current.filteredAlerts).toEqual([]);
    expect(result.current.visibleSeverities.size).toBe(4);
    for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
      expect(result.current.visibleSeverities.has(sev)).toBe(true);
    }
  });

  it("ingest(alert) CT01 grows the list", () => {
    const { result } = renderHook(() => useAlerts());
    act(() => {
      expect(result.current.ingest(ct01AlertEvent).ok).toBe(true);
    });
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0]?.id).toBe(CT01_ID);
    expect(result.current.alerts[0]?.status).toBe("OPEN");
  });

  it("ingest invalid does not add", () => {
    const { result } = renderHook(() => useAlerts());
    act(() => {
      const outcome = result.current.ingest({
        event: "alert",
        data: { ...ct01AlertEvent.data, severity: "URGENT" },
      });
      expect(outcome.ok).toBe(false);
    });
    expect(result.current.alerts).toHaveLength(0);
  });

  it("ingest(done) does not clear alerts", () => {
    const { result } = renderHook(() => useAlerts());
    act(() => {
      result.current.ingest(ct01AlertEvent);
    });
    act(() => {
      expect(
        result.current.ingest({
          event: "done",
          data: {
            status: "completed",
            analysis_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
            duration_ms: 100,
          },
        }).ok,
      ).toBe(true);
    });
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.analysisDone).toBe(true);
  });

  it("toggleFilter hides and restores the same id", () => {
    const { result } = renderHook(() => useAlerts());
    act(() => {
      result.current.ingest(ct01AlertEvent);
    });
    expect(result.current.filteredAlerts).toHaveLength(1);

    act(() => {
      result.current.toggleFilter("CRITICAL");
    });
    expect(result.current.filteredAlerts).toHaveLength(0);
    expect(result.current.alerts[0]?.id).toBe(CT01_ID);

    act(() => {
      result.current.toggleFilter("CRITICAL");
    });
    expect(result.current.filteredAlerts).toHaveLength(1);
    expect(result.current.filteredAlerts[0]?.id).toBe(CT01_ID);
  });

  it("resolveAlert removes alert from OPEN count", () => {
    const { result } = renderHook(() => useAlerts());
    act(() => {
      result.current.ingest(ct01AlertEvent);
    });
    expect(result.current.openCount.CRITICAL).toBe(1);

    act(() => {
      result.current.resolveAlert(CT01_ID);
    });
    expect(result.current.openCount.CRITICAL).toBe(0);
    expect(result.current.alerts[0]?.status).toBe("RESOLVED");
    expect(result.current.healthScore.code_health_score).toBe(100);
  });
});

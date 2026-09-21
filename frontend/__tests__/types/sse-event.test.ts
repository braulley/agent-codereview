import type { AlertItem } from "@/types/alert";
import type { ErrorPayload, SseEvent } from "@/types/analysis";

const ct01Alert: AlertItem = {
  id: "11111111-1111-4111-8111-111111111111",
  file: "users.py",
  line_start: 12,
  line_end: 12,
  severity: "CRITICAL",
  title: "SQL Injection via concatenação direta de input",
  description: "desc",
  suggestion: "use parameterized query",
  category: "SECURITY",
};

describe("SseEvent union", () => {
  it("covers alert | score | done | error", () => {
    const alert: SseEvent = { event: "alert", data: ct01Alert };
    const score: SseEvent = {
      event: "score",
      data: {
        code_health_score: 75,
        alert_count: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
      },
    };
    const done: SseEvent = {
      event: "done",
      data: {
        status: "completed",
        analysis_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        duration_ms: 2340,
      },
    };
    const error: SseEvent = {
      event: "error",
      data: {
        error: "LLM_TIMEOUT",
        message: "A análise excedeu o tempo limite de 30 segundos.",
        analysis_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      } satisfies ErrorPayload,
    };

    const events: SseEvent[] = [alert, score, done, error];
    expect(events.map((e) => e.event)).toEqual([
      "alert",
      "score",
      "done",
      "error",
    ]);
  });
});

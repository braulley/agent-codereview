import { feedSse, parseSseBlock } from "@/lib/sse-parse";

const CT01_ID = "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c";

const ct01AlertJson = JSON.stringify({
  id: CT01_ID,
  file: "users.py",
  line_start: 12,
  line_end: 12,
  severity: "CRITICAL",
  title: "SQL Injection via concatenação direta de input",
  description: "desc",
  suggestion: "use parameterized query",
  category: "SECURITY",
});

describe("sse-parse", () => {
  it("parses a CT01 alert frame", () => {
    const block = `event: alert\ndata: ${ct01AlertJson}\n\n`;
    const result = feedSse("", block);
    expect(result.frames).toHaveLength(1);
    expect(result.frames[0]).toEqual({
      ok: true,
      event: "alert",
      data: JSON.parse(ct01AlertJson),
    });
  });

  it("parses score then done sequence", () => {
    const text = [
      'event: score',
      'data: {"code_health_score":100,"alert_count":{"CRITICAL":0,"HIGH":0,"MEDIUM":0,"LOW":0}}',
      "",
      "event: done",
      'data: {"status":"completed","analysis_id":"7c9e6679-7425-40de-944b-e07fc1f90ae7","duration_ms":100}',
      "",
      "",
    ].join("\n");
    const result = feedSse("", text);
    expect(result.frames).toHaveLength(2);
    expect(result.frames[0]?.ok && result.frames[0].event).toBe("score");
    expect(result.frames[1]?.ok && result.frames[1].event).toBe("done");
  });

  it("parses event: error LLM_TIMEOUT", () => {
    const text = [
      "event: error",
      'data: {"error":"LLM_TIMEOUT","message":"A análise excedeu o tempo limite de 30 segundos.","analysis_id":"7c9e6679-7425-40de-944b-e07fc1f90ae7"}',
      "",
      "",
    ].join("\n");
    const result = feedSse("", text);
    expect(result.frames[0]).toEqual({
      ok: true,
      event: "error",
      data: {
        error: "LLM_TIMEOUT",
        message: "A análise excedeu o tempo limite de 30 segundos.",
        analysis_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      },
    });
  });

  it("ignores SSE comments", () => {
    const text = ": stream-open\n\nevent: alert\ndata: " + ct01AlertJson + "\n\n";
    const result = feedSse("", text);
    expect(result.frames).toHaveLength(1);
    expect(result.frames[0]?.ok && result.frames[0].event).toBe("alert");
  });

  it("handles chunk fragmented in the middle of data", () => {
    const full = `event: alert\ndata: ${ct01AlertJson}\n\n`;
    const mid = Math.floor(full.length / 2);
    const first = feedSse("", full.slice(0, mid));
    expect(first.frames).toHaveLength(0);
    const second = feedSse(first.buffer, full.slice(mid));
    expect(second.frames).toHaveLength(1);
    expect(second.frames[0]?.ok && second.frames[0].event).toBe("alert");
  });

  it("rejects invalid JSON data", () => {
    const result = parseSseBlock("event: alert\ndata: {not-json");
    expect(result).toEqual({ ok: false, reason: "invalid_json" });
  });
});

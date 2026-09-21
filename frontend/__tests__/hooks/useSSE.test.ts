import { act, renderHook, waitFor } from "@testing-library/react";
import {
  ANALYZE_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MESSAGE,
  useSSE,
} from "@/hooks/useSSE";
import { ANALYZE } from "@/lib/api-paths";

const CT01_ID = "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c";
const ANALYSIS_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const ct01Alert = {
  id: CT01_ID,
  file: "users.py",
  line_start: 12,
  line_end: 12,
  severity: "CRITICAL",
  title: "SQL Injection via concatenação direta de input",
  description: "desc",
  suggestion: "use parameterized query",
  category: "SECURITY",
};

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function sseResponse(chunks: string[]): {
  ok: true;
  status: number;
  body: {
    getReader: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>;
    };
  };
  json: () => Promise<unknown>;
} {
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: () => {
          if (i < chunks.length) {
            const value = encodeUtf8(chunks[i]);
            i += 1;
            return Promise.resolve({ done: false, value });
          }
          return Promise.resolve({ done: true, value: undefined });
        },
      }),
    },
    json: async () => ({}),
  };
}

function httpErrorResponse(
  status: number,
  body: Record<string, string>,
): {
  ok: false;
  status: number;
  body: null;
  json: () => Promise<Record<string, string>>;
} {
  return {
    ok: false,
    status,
    body: null,
    json: async () => body,
  };
}

function makeCallbacks() {
  return {
    onAlert: jest.fn(),
    onScore: jest.fn(),
    onDone: jest.fn(),
    onError: jest.fn(),
  };
}

describe("useSSE", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("calls onAlert for each alert event", async () => {
    const cbs = makeCallbacks();
    const frame = `event: alert\ndata: ${JSON.stringify(ct01Alert)}\n\n`;
    global.fetch = jest.fn().mockResolvedValue(sseResponse([frame]));

    const { result } = renderHook(() => useSSE(cbs));
    await act(async () => {
      await result.current.start({
        code: "x = 1",
        language: "python",
      });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      ANALYZE,
      expect.objectContaining({ method: "POST" }),
    );
    expect(cbs.onAlert).toHaveBeenCalledWith(ct01Alert);
  });

  it("calls onScore then onDone", async () => {
    const cbs = makeCallbacks();
    const score = {
      code_health_score: 100,
      alert_count: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    };
    const done = {
      status: "completed",
      analysis_id: ANALYSIS_ID,
      duration_ms: 50,
    };
    const text = [
      `event: score\ndata: ${JSON.stringify(score)}\n\n`,
      `event: done\ndata: ${JSON.stringify(done)}\n\n`,
    ];
    global.fetch = jest.fn().mockResolvedValue(sseResponse(text));

    const { result } = renderHook(() => useSSE(cbs));
    await act(async () => {
      await result.current.start({ code: "ok", language: "python" });
    });

    expect(cbs.onScore).toHaveBeenCalledWith(score);
    expect(cbs.onDone).toHaveBeenCalledWith(done);
    expect(cbs.onError).not.toHaveBeenCalled();
  });

  it("calls onError for event: error", async () => {
    const cbs = makeCallbacks();
    const payload = {
      error: "LLM_TIMEOUT",
      message: DEFAULT_TIMEOUT_MESSAGE,
      analysis_id: ANALYSIS_ID,
    };
    const frame = `event: error\ndata: ${JSON.stringify(payload)}\n\n`;
    global.fetch = jest.fn().mockResolvedValue(sseResponse([frame]));

    const { result } = renderHook(() => useSSE(cbs));
    await act(async () => {
      await result.current.start({ code: "x", language: "python" });
    });

    expect(cbs.onError).toHaveBeenCalledWith(payload);
    expect(cbs.onDone).not.toHaveBeenCalled();
  });

  it("calls onError on HTTP 422 without parsing SSE", async () => {
    const cbs = makeCallbacks();
    global.fetch = jest.fn().mockResolvedValue(
      httpErrorResponse(422, {
        error: "INVALID_ANALYZE_REQUEST",
        message: "Payload inválido",
      }),
    );

    const { result } = renderHook(() => useSSE(cbs));
    await act(async () => {
      await result.current.start({ code: "x", language: "python" });
    });

    expect(cbs.onError).toHaveBeenCalledWith({
      error: "INVALID_ANALYZE_REQUEST",
      message: "Payload inválido",
    });
  });

  it("calls onError after 30s timeout (CT04)", async () => {
    jest.useFakeTimers();
    const cbs = makeCallbacks();
    global.fetch = jest.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const { result } = renderHook(() => useSSE(cbs));
    let pending: Promise<void>;
    act(() => {
      pending = result.current.start({ code: "x", language: "python" });
    });

    await act(async () => {
      jest.advanceTimersByTime(ANALYZE_TIMEOUT_MS);
      await pending!;
    });

    expect(cbs.onError).toHaveBeenCalledWith({
      error: "LLM_TIMEOUT",
      message: DEFAULT_TIMEOUT_MESSAGE,
    });
  });

  it("second start aborts the first", async () => {
    const cbs = makeCallbacks();
    const signals: AbortSignal[] = [];
    global.fetch = jest.fn().mockImplementation(
      (_url: string, init?: RequestInit) => {
        if (init?.signal) {
          signals.push(init.signal);
        }
        return new Promise(() => {
          /* hang */
        });
      },
    );

    const { result } = renderHook(() => useSSE(cbs));
    act(() => {
      void result.current.start({ code: "one", language: "python" });
    });
    await waitFor(() => expect(signals).toHaveLength(1));

    act(() => {
      void result.current.start({ code: "two", language: "python" });
    });
    await waitFor(() => expect(signals).toHaveLength(2));

    expect(signals[0]?.aborted).toBe(true);
    expect(cbs.onError).not.toHaveBeenCalled();
  });

  it("unmount aborts in-flight fetch", async () => {
    const cbs = makeCallbacks();
    let signal: AbortSignal | undefined;
    global.fetch = jest.fn().mockImplementation(
      (_url: string, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise(() => {
          /* hang */
        });
      },
    );

    const { result, unmount } = renderHook(() => useSSE(cbs));
    act(() => {
      void result.current.start({ code: "x", language: "python" });
    });
    await waitFor(() => expect(signal).toBeDefined());

    unmount();
    expect(signal?.aborted).toBe(true);
    expect(cbs.onError).not.toHaveBeenCalled();
  });
});

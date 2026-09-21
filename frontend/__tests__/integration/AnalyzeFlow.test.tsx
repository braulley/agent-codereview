import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { ANALYZE } from "@/lib/api-paths";
import {
  ANALYZE_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MESSAGE,
} from "@/hooks/useSSE";

const CT01_ID = "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c";
const ANALYSIS_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

const CT01_CODE =
  'query = "SELECT * FROM users WHERE id = " + user_input\n';

const ct01Alert = {
  id: CT01_ID,
  file: "users.py",
  line_start: 12,
  line_end: 12,
  severity: "CRITICAL",
  title: "SQL Injection via concatenação direta de input",
  description:
    "A query SQL é construída por concatenação direta de input não sanitizado.",
  suggestion:
    "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
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

async function waitForEditor() {
  return screen.findByTestId("monaco-mock");
}

async function pasteAndAnalyze(code: string) {
  const user = userEvent.setup();
  const editor = await waitForEditor();
  await user.clear(editor);
  await user.type(editor, code);
  await user.click(screen.getByRole("button", { name: "Analisar" }));
  return user;
}

describe("AnalyzeFlow", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("shows skeleton after Analisar click", async () => {
    let resolveFetch: ((r: ReturnType<typeof sseResponse>) => void) | undefined;
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(<Home />);
    await pasteAndAnalyze(CT01_CODE);

    expect(
      await screen.findByTestId("alert-panel-skeleton"),
    ).toBeInTheDocument();

    await act(async () => {
      resolveFetch?.(
        sseResponse([
          `event: done\ndata: ${JSON.stringify({
            status: "completed",
            analysis_id: ANALYSIS_ID,
            duration_ms: 10,
          })}\n\n`,
        ]),
      );
    });
  });

  it("CT01: SQL injection alert appears in the panel", async () => {
    const score = {
      code_health_score: 75,
      alert_count: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
    };
    global.fetch = jest.fn().mockResolvedValue(
      sseResponse([
        `event: alert\ndata: ${JSON.stringify(ct01Alert)}\n\n`,
        `event: score\ndata: ${JSON.stringify(score)}\n\n`,
        `event: done\ndata: ${JSON.stringify({
          status: "completed",
          analysis_id: ANALYSIS_ID,
          duration_ms: 100,
        })}\n\n`,
      ]),
    );

    render(<Home />);
    await pasteAndAnalyze(CT01_CODE);

    await waitFor(() => {
      expect(
        screen.getByText("SQL Injection via concatenação direta de input"),
      ).toBeInTheDocument();
    });
    expect(screen.getAllByText("CRITICAL").length).toBeGreaterThan(0);
  });

  it("CT03: clean code shows empty panel and score 100 without error toast", async () => {
    const score = {
      code_health_score: 100,
      alert_count: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    };
    global.fetch = jest.fn().mockResolvedValue(
      sseResponse([
        `event: score\ndata: ${JSON.stringify(score)}\n\n`,
        `event: done\ndata: ${JSON.stringify({
          status: "completed",
          analysis_id: ANALYSIS_ID,
          duration_ms: 80,
        })}\n\n`,
      ]),
    );

    render(<Home />);
    await pasteAndAnalyze("print('hello')\n");

    await waitFor(() => {
      expect(screen.getByText("Nenhum problema encontrado")).toBeInTheDocument();
    });
    expect(
      screen.queryByRole("button", { name: "Tentar Novamente" }),
    ).not.toBeInTheDocument();
  });

  it("CT04: timeout toast retry re-sends without clearing editor", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    global.fetch = jest.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    render(<Home />);
    const editor = await waitForEditor();
    await user.clear(editor);
    await user.type(editor, CT01_CODE);
    await user.click(screen.getByRole("button", { name: "Analisar" }));

    await act(async () => {
      jest.advanceTimersByTime(ANALYZE_TIMEOUT_MS);
    });

    const retry = await screen.findByRole("button", {
      name: "Tentar Novamente",
    });
    expect(screen.getByText(DEFAULT_TIMEOUT_MESSAGE)).toBeInTheDocument();
    expect(editor).toHaveValue(CT01_CODE);

    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    await user.click(retry);

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(
        callsBefore,
      );
    });
    expect(editor).toHaveValue(CT01_CODE);

    const lastCall = (global.fetch as jest.Mock).mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(ANALYZE);
    const body = JSON.parse(lastCall?.[1]?.body as string) as {
      code: string;
    };
    expect(body.code).toBe(CT01_CODE);
  });

  it("preserves editor code when analysis errors", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      sseResponse([
        `event: error\ndata: ${JSON.stringify({
          error: "LLM_SCHEMA",
          message: "Resposta inválida do modelo.",
          analysis_id: ANALYSIS_ID,
        })}\n\n`,
      ]),
    );

    render(<Home />);
    await pasteAndAnalyze(CT01_CODE);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Tentar Novamente" }),
      ).toBeInTheDocument();
    });
    expect(await waitForEditor()).toHaveValue(CT01_CODE);
  });

  it("does not call API when editor is empty", async () => {
    global.fetch = jest.fn();
    const user = userEvent.setup();
    render(<Home />);
    await waitForEditor();
    await user.click(screen.getByRole("button", { name: "Analisar" }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      screen.getByText("Cole código no editor antes de analisar."),
    ).toBeInTheDocument();
  });
});

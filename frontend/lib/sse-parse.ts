/**
 * Pure SSE frame parser — no React, no fetch.
 * Accumulates chunks until `\n\n`, ignores comment lines (`:`), extracts
 * `event` + JSON `data`.
 */

export type SseFrameOk = { ok: true; event: string; data: unknown };
export type SseFrameFail = { ok: false; reason: "invalid_json" };
export type SseFrameResult = SseFrameOk | SseFrameFail;

export type SseFeedResult = {
  buffer: string;
  frames: SseFrameResult[];
};

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

/**
 * Parse one SSE event block (text between blank-line delimiters).
 * Returns `null` when the block is empty or comment-only (ignore).
 */
export function parseSseBlock(block: string): SseFrameResult | null {
  const lines = normalizeNewlines(block).split("\n");
  let eventName = "";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
      continue;
    }
    if (line.startsWith(":")) {
      continue;
    }
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trimStart();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
      continue;
    }
  }

  if (dataLines.length === 0) {
    return null;
  }
  if (!eventName) {
    return { ok: false, reason: "invalid_json" };
  }

  const raw = dataLines.join("\n");
  try {
    const data: unknown = JSON.parse(raw);
    return { ok: true, event: eventName, data };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}

/** Feed a chunk into an SSE text buffer; emit complete frames. */
export function feedSse(buffer: string, chunk: string): SseFeedResult {
  let next = buffer + normalizeNewlines(chunk);
  const frames: SseFrameResult[] = [];

  while (true) {
    const idx = next.indexOf("\n\n");
    if (idx < 0) {
      break;
    }
    const block = next.slice(0, idx);
    next = next.slice(idx + 2);
    const parsed = parseSseBlock(block);
    if (parsed !== null) {
      frames.push(parsed);
    }
  }

  return { buffer: next, frames };
}

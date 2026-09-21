import { act, renderHook } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useEditor } from "@/hooks/useEditor";

describe("CT08 large fixture smoke", () => {
  it("loads ~2000 lines into session without throwing", () => {
    const fixture = readFileSync(
      join(__dirname, "../fixtures/ct08-large.txt"),
      "utf8",
    );
    const lines = fixture.split(/\r?\n/).filter((l) => l.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(2000);

    const { result } = renderHook(() => useEditor());
    act(() => {
      result.current.setContent(fixture);
    });
    expect(result.current.content.split(/\r?\n/).length).toBeGreaterThanOrEqual(
      2000,
    );
  });
});

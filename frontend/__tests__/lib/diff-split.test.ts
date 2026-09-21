import { splitUnifiedDiff } from "@/lib/diff-split";

describe("splitUnifiedDiff", () => {
  it("splits added and removed lines", () => {
    const result = splitUnifiedDiff(
      ["@@ -1 +1 @@", "-old", "+new", " context"].join("\n"),
    );
    expect(result.oldValue).toContain("old");
    expect(result.oldValue).toContain("context");
    expect(result.newValue).toContain("new");
    expect(result.newValue).toContain("context");
    expect(result.hunkStarts.length).toBeGreaterThanOrEqual(1);
  });
});

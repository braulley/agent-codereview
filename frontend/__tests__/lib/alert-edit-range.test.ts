import {
  alertToEditRange,
  extractSnippet,
} from "@/lib/alert-edit-range";

describe("alertToEditRange", () => {
  const ct01Lines = [
    "def get_user(user_input):",
    "    # setup",
    "    # more",
    "    # …",
    "    # line 5",
    "    # line 6",
    "    # line 7",
    "    # line 8",
    "    # line 9",
    "    # line 10",
    "    # line 11",
    '    cursor.execute("SELECT * FROM users WHERE id = " + user_input)',
    "    return True",
  ].join("\n");

  it("maps single-line CT01 range (L12)", () => {
    const suggestion =
      "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))";
    const result = alertToEditRange(ct01Lines, 12, 12, suggestion);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.edit.range).toEqual({
      startLineNumber: 12,
      startColumn: 1,
      endLineNumber: 12,
      endColumn:
        '    cursor.execute("SELECT * FROM users WHERE id = " + user_input)'
          .length + 1,
    });
    expect(result.edit.text).toBe(suggestion);
    expect(result.beforeSnippet).toContain("SELECT * FROM users");
  });

  it("maps multi-line inclusive span", () => {
    const content = "a\nb\nc\nd";
    const result = alertToEditRange(content, 2, 3, "X\nY");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.beforeSnippet).toBe("b\nc");
    expect(result.edit.range).toEqual({
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 3,
      endColumn: 2,
    });
  });

  it("rejects line past end of model", () => {
    const result = alertToEditRange("only\ntwo", 1, 5, "x");
    expect(result).toEqual({ ok: false, reason: "out_of_range" });
  });

  it("rejects inverted span", () => {
    const result = alertToEditRange("a\nb", 2, 1, "x");
    expect(result).toEqual({ ok: false, reason: "invalid_span" });
  });
});

describe("extractSnippet", () => {
  it("returns null when out of range", () => {
    expect(extractSnippet("a\nb", 1, 9)).toBeNull();
  });

  it("returns joined lines", () => {
    expect(extractSnippet("a\nb\nc", 1, 2)).toBe("a\nb");
  });
});

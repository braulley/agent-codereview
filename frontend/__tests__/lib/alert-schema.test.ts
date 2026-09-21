import { parseAlertItem } from "@/lib/alert-schema";

/** CT01 SQL-injection fixture (docs/spec.md RF02 / backend ct01). */
const ct01Alert = {
  id: "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c",
  file: "users.py",
  line_start: 12,
  line_end: 12,
  severity: "CRITICAL",
  title: "SQL Injection via concatenação direta de input",
  description:
    "A query SQL é construída por concatenação direta de input não sanitizado. Referência: OWASP Top 10 — A03:2021 Injection.",
  suggestion: "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
  category: "SECURITY",
};

describe("parseAlertItem", () => {
  it("accepts CT01 SQL Injection fixture", () => {
    const result = parseAlertItem(ct01Alert);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.severity).toBe("CRITICAL");
      expect(result.value.category).toBe("SECURITY");
      expect(result.value.line_start).toBe(12);
      expect(result.value.title).toContain("SQL Injection");
    }
  });

  it("rejects object without severity", () => {
    const { severity: _s, ...without } = ct01Alert;
    void _s;
    expect(parseAlertItem(without).ok).toBe(false);
  });

  it('rejects severity "URGENT"', () => {
    expect(
      parseAlertItem({ ...ct01Alert, severity: "URGENT" }).ok,
    ).toBe(false);
  });

  it("rejects line_end < line_start", () => {
    expect(
      parseAlertItem({ ...ct01Alert, line_start: 20, line_end: 10 }).ok,
    ).toBe(false);
  });
});

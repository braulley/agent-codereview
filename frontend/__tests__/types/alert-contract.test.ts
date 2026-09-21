import type { AlertItem, Severity } from "@/types/alert";

/** CT01 SQL-injection fixture shape (backend/tests/fixtures/ct01_sql_injection.json). */
const ct01Alert = {
  file: "users.py",
  line_start: 12,
  line_end: 12,
  severity: "CRITICAL",
  title: "SQL Injection via concatenação direta de input",
  description:
    "A query SQL é construída por concatenação direta de input não sanitizado. Referência: OWASP Top 10 — A03:2021 Injection.",
  suggestion: "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
  category: "SECURITY",
} as const;

describe("AlertItem contract", () => {
  it("accepts a CT01 SQL-injection alert as AlertItem", () => {
    const alert: AlertItem = {
      id: "11111111-1111-4111-8111-111111111111",
      file: ct01Alert.file,
      line_start: ct01Alert.line_start,
      line_end: ct01Alert.line_end,
      severity: ct01Alert.severity,
      title: ct01Alert.title,
      description: ct01Alert.description,
      suggestion: ct01Alert.suggestion,
      category: ct01Alert.category,
    };

    expect(alert.severity).toBe("CRITICAL");
    expect(alert.line_start).toBe(12);
    expect(alert.line_end).toBe(12);
    expect(alert.category).toBe("SECURITY");
  });

  it("rejects severity outside the enum via fixture JSON", () => {
    const invalidFixture = {
      ...ct01Alert,
      id: "22222222-2222-4222-8222-222222222222",
      severity: "ULTRA",
    };

    const allowed: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    expect(allowed.includes(invalidFixture.severity as Severity)).toBe(false);

    // Compile-time: assigning FOO severity must not type-check as AlertItem.
    // @ts-expect-error severity outside Severity union
    const _bad: AlertItem = invalidFixture;
    void _bad;
  });
});

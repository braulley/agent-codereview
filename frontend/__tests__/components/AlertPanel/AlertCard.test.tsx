import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlertCard } from "@/components/AlertPanel/AlertCard";
import type { SessionAlert } from "@/hooks/useAlerts";

const ct01: SessionAlert = {
  id: "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c",
  file: "users.py",
  line_start: 12,
  line_end: 12,
  severity: "CRITICAL",
  title: "SQL Injection via concatenação direta de input",
  description:
    "A query SQL é construída por concatenação direta de input não sanitizado. Referência: OWASP Top 10 — A03:2021 Injection.",
  suggestion:
    "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
  category: "SECURITY",
  status: "OPEN",
};

const ct02: SessionAlert = {
  id: "b4e9d3f2-5e6c-4f3a-9b2d-0c8e4f7a3b1d",
  file: "config.py",
  line_start: 3,
  line_end: 3,
  severity: "CRITICAL",
  title: "Hardcoded API secret in source",
  description:
    "Credencial sensível embutida no código. Referência: OWASP Top 10 — A02:2021 Cryptographic Failures.",
  suggestion: "API_KEY = os.environ['API_KEY']",
  category: "SECURITY",
  status: "OPEN",
};

describe("AlertCard", () => {
  it("renders CT01 CRITICAL + SECURITY with L12", () => {
    render(<AlertCard alert={ct01} />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText("[SECURITY]")).toBeInTheDocument();
    expect(screen.getByText("L12")).toBeInTheDocument();
    expect(
      screen.getByText("SQL Injection via concatenação direta de input"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
      ),
    ).toBeInTheDocument();
  });

  it("renders CT02 hardcoded secret without omitting suggestion", () => {
    render(<AlertCard alert={ct02} />);
    expect(screen.getByText("CRITICAL")).toBeInTheDocument();
    expect(screen.getByText("[SECURITY]")).toBeInTheDocument();
    expect(screen.getByText("API_KEY = os.environ['API_KEY']")).toBeInTheDocument();
  });

  it("Aplicar Correção is enabled on OPEN; status stays controlled by parent", async () => {
    const user = userEvent.setup();
    const onApplyFix = jest.fn();
    render(<AlertCard alert={ct01} onApplyFix={onApplyFix} />);
    const button = screen.getByRole("button", { name: "Aplicar Correção" });
    expect(button).not.toBeDisabled();
    await user.click(button);
    expect(onApplyFix).toHaveBeenCalledWith(ct01.id);
    expect(screen.getByTestId("alert-card")).toHaveAttribute(
      "data-status",
      "OPEN",
    );
  });

  it("shows RESOLVED visual state", () => {
    render(<AlertCard alert={{ ...ct01, status: "RESOLVED" }} />);
    expect(screen.getByTestId("alert-card")).toHaveAttribute(
      "data-status",
      "RESOLVED",
    );
    expect(screen.getByLabelText("Resolvido")).toBeInTheDocument();
  });
});

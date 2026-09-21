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
    "A query SQL é construída por concatenação direta de input não sanitizado.",
  suggestion:
    "cursor.execute('SELECT * FROM users WHERE id = ?', (user_input,))",
  category: "SECURITY",
  status: "OPEN",
};

describe("AlertCard apply button", () => {
  it("OPEN button is enabled and calls onApplyFix", async () => {
    const user = userEvent.setup();
    const onApplyFix = jest.fn();
    render(<AlertCard alert={ct01} onApplyFix={onApplyFix} />);
    const button = screen.getByRole("button", { name: "Aplicar Correção" });
    expect(button).not.toBeDisabled();
    expect(button.className).toMatch(/font-bold/);
    await user.click(button);
    expect(onApplyFix).toHaveBeenCalledWith(ct01.id);
  });

  it("RESOLVED button is disabled and does not call onApplyFix", async () => {
    const user = userEvent.setup();
    const onApplyFix = jest.fn();
    render(
      <AlertCard
        alert={{ ...ct01, status: "RESOLVED" }}
        onApplyFix={onApplyFix}
      />,
    );
    const button = screen.getByRole("button", { name: "Aplicar Correção" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onApplyFix).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Resolvido")).toBeInTheDocument();
  });
});

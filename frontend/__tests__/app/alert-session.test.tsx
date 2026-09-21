import { act, render, screen } from "@testing-library/react";
import Home from "../../app/page";
import { AlertPanel } from "@/components/AlertPanel/AlertPanel";
import { ACR_INGEST_EVENT } from "@/lib/acr-ingest-event";
import { INVALID_ALERT_TOAST } from "@/lib/alert-schema";
import type { SessionAlert } from "@/hooks/useAlerts";
import type { Severity } from "@/types/alert";

function uuid(n: number): string {
  const hex = n.toString(16).padStart(12, "0");
  return `a3f8c2e1-4d5b-4e2f-8a1c-${hex}`;
}

describe("alert session (page)", () => {
  it("invalid ingest shows toast and Central Stage remains", async () => {
    render(<Home />);

    const stage = screen.getByRole("main", { name: "Central Stage" });
    expect(stage).toBeInTheDocument();
    expect(screen.getByTestId("code-editor")).toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(ACR_INGEST_EVENT, {
          detail: {
            event: "alert",
            data: {
              id: uuid(1),
              file: "users.py",
              line_start: 12,
              line_end: 12,
              // missing severity
              title: "x",
              description: "y",
              suggestion: "secret suggestion must not appear in toast",
              category: "SECURITY",
            },
          },
        }),
      );
    });

    expect(screen.getByText(INVALID_ALERT_TOAST)).toBeInTheDocument();
    expect(
      screen.queryByText("secret suggestion must not appear in toast"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("main", { name: "Central Stage" })).toBeInTheDocument();
    expect(screen.getByTestId("code-editor")).toBeInTheDocument();
  });

  it("renders 50 alert cards (RNF04 panel)", () => {
    const alerts: SessionAlert[] = Array.from({ length: 50 }, (_, i) => {
      const severities: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
      return {
        id: uuid(i + 1),
        file: `f${i}.py`,
        line_start: i + 1,
        line_end: i + 1,
        severity: severities[i % 4]!,
        title: `Alert ${i}`,
        description: "d",
        suggestion: "s",
        category: "QUALITY",
        status: "OPEN",
      };
    });

    render(<AlertPanel alerts={alerts} />);
    expect(screen.getAllByTestId("alert-card")).toHaveLength(50);
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { AlertPanel } from "@/components/AlertPanel/AlertPanel";
import { SeverityFilters } from "@/components/AlertPanel/SeverityFilters";
import type { SessionAlert } from "@/hooks/useAlerts";
import type { Severity } from "@/types/alert";
import { calculateHealthScore } from "@/lib/health-score";

const base = {
  file: "a.py",
  line_start: 1,
  line_end: 1,
  title: "Issue",
  description: "desc",
  suggestion: "fix()",
  category: "QUALITY" as const,
  status: "OPEN" as const,
};

function alert(
  id: string,
  severity: Severity,
  status: SessionAlert["status"] = "OPEN",
): SessionAlert {
  return {
    ...base,
    id,
    severity,
    status,
    title: `${severity} issue`,
  };
}

describe("AlertPanel", () => {
  it("shows empty CT03 message", () => {
    render(<AlertPanel alerts={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Nenhum problema encontrado",
    );
  });

  it("renders RESOLVED card when present", () => {
    render(
      <AlertPanel
        alerts={[
          alert("a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a0c", "CRITICAL", "RESOLVED"),
        ]}
      />,
    );
    expect(screen.getByTestId("alert-card")).toHaveAttribute(
      "data-status",
      "RESOLVED",
    );
  });

  it("CT06: hide LOW+MEDIUM leaves CRITICAL/HIGH; reactivate MEDIUM restores", async () => {
    const user = userEvent.setup();
    const alerts: SessionAlert[] = [
      alert("a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a01", "CRITICAL"),
      alert("a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a02", "HIGH"),
      alert("a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a03", "MEDIUM"),
      alert("a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a04", "LOW"),
    ];

    function Harness() {
      const [visible, setVisible] = useState(
        () => new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
      );
      const filtered = alerts.filter((a) => visible.has(a.severity));
      const openCount = calculateHealthScore(
        alerts.filter((a) => a.status === "OPEN"),
      ).alert_count;
      return (
        <>
          <SeverityFilters
            visibleSeverities={visible}
            openCount={openCount}
            onToggle={(sev) => {
              setVisible((prev) => {
                const next = new Set(prev);
                if (next.has(sev)) next.delete(sev);
                else next.add(sev);
                return next;
              });
            }}
          />
          <AlertPanel alerts={filtered} />
        </>
      );
    }

    render(<Harness />);
    expect(screen.getAllByTestId("alert-card")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: /LOW/ }));
    await user.click(screen.getByRole("button", { name: /MEDIUM/ }));
    const visible = screen.getAllByTestId("alert-card");
    expect(visible).toHaveLength(2);
    expect(visible.map((el) => el.getAttribute("data-alert-id"))).toEqual([
      "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a01",
      "a3f8c2e1-4d5b-4e2f-8a1c-9b7d3e6f2a02",
    ]);

    await user.click(screen.getByRole("button", { name: /MEDIUM/ }));
    expect(screen.getAllByTestId("alert-card")).toHaveLength(3);
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SeverityFilters } from "@/components/AlertPanel/SeverityFilters";
import type { Severity } from "@/types/alert";

describe("SeverityFilters", () => {
  it("renders four chips with HIGH (N) format; default all pressed", () => {
    const openCount = { CRITICAL: 1, HIGH: 2, MEDIUM: 5, LOW: 3 };
    render(
      <SeverityFilters
        visibleSeverities={
          new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"])
        }
        openCount={openCount}
        onToggle={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /CRITICAL/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /HIGH \(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /MEDIUM \(5\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /LOW \(3\)/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("HIGH (2) with 2 OPEN + 1 RESOLVED counted only as open", () => {
    render(
      <SeverityFilters
        visibleSeverities={new Set<Severity>(["HIGH"])}
        openCount={{ CRITICAL: 0, HIGH: 2, MEDIUM: 0, LOW: 0 }}
        onToggle={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /HIGH \(2\)/ })).toBeInTheDocument();
  });

  it("click toggles without fetch", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    function Harness() {
      const [visible, setVisible] = useState(
        () => new Set<Severity>(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
      );
      return (
        <SeverityFilters
          visibleSeverities={visible}
          openCount={{ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 1 }}
          onToggle={(sev) => {
            setVisible((prev) => {
              const next = new Set(prev);
              if (next.has(sev)) next.delete(sev);
              else next.add(sev);
              return next;
            });
          }}
        />
      );
    }

    render(<Harness />);
    const low = screen.getByRole("button", { name: /LOW/ });
    await user.click(low);
    expect(low).toHaveAttribute("aria-pressed", "false");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

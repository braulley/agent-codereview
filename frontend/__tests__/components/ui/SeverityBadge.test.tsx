import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import type { Severity } from "@/types/alert";

const SEVERITIES: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

describe("SeverityBadge", () => {
  it.each(SEVERITIES)("renders %s with severity token class", (severity) => {
    render(<SeverityBadge severity={severity} />);
    const badge = screen.getByText(severity);
    expect(badge).toHaveAttribute("data-severity", severity);
    expect(badge.className).toMatch(
      new RegExp(`severity-${severity.toLowerCase()}|text-severity-${severity.toLowerCase()}`),
    );
  });
});

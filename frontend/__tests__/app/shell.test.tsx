import { render, screen, within } from "@testing-library/react";
import Home from "../../app/page";

describe("Shell", () => {
  it("exposes the three pane landmarks", () => {
    render(<Home />);
    expect(
      screen.getByRole("complementary", {
        name: "Left Telemetry Rail",
        hidden: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("main", { name: "Central Stage" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("complementary", {
        name: "Right Action Drawer",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("renders Telemetry, Editor, and Remediation tabs on narrow viewports", () => {
    render(<Home />);
    const tablist = screen.getByRole("navigation", { name: "Shell panes" });
    expect(tablist).toBeInTheDocument();
    const tabs = within(tablist);
    expect(tabs.getByRole("button", { name: "Telemetry" })).toBeInTheDocument();
    expect(tabs.getByRole("button", { name: "Editor" })).toBeInTheDocument();
    expect(tabs.getByRole("button", { name: "Remediation" })).toBeInTheDocument();
    expect(tablist.querySelectorAll("button")).toHaveLength(3);
  });
});

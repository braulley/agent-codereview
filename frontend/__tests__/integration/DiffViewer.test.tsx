import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { DiffViewer } from "@/components/DiffViewer/DiffViewer";

const SAMPLE_DIFF = `diff --git a/a.py b/a.py
--- a/a.py
+++ b/a.py
@@ -1,2 +1,2 @@
 def a():
-    return 1
+    return 2
@@ -10,1 +10,1 @@
-x = 1
+x = 2
`;

const FIXTURE_ALERTS = [
  { id: "a1", severity: "HIGH", title: "issue" },
  { id: "a2", severity: "LOW", title: "nit" },
];

function DiffHarness() {
  const [alerts] = useState(FIXTURE_ALERTS);
  return (
    <div>
      <DiffViewer diffText={SAMPLE_DIFF} alerts={alerts} />
      <ul data-testid="alert-list">
        {alerts.map((a) => (
          <li key={a.id}>{a.title}</li>
        ))}
      </ul>
    </div>
  );
}

describe("DiffViewer integration", () => {
  it("side-by-side mode renders both panes (CA-RF07-01)", async () => {
    render(<DiffHarness />);
    // Pane titles (distinct from hunk-nav button label "Anterior")
    const mock = await screen.findByTestId("diff-lib-mock");
    expect(mock.querySelector('[data-pane="old"]')).toHaveTextContent(
      "Anterior",
    );
    expect(mock.querySelector('[data-pane="new"]')).toHaveTextContent(
      "Posterior",
    );
    expect(screen.getByTestId("diff-viewer-body")).toHaveAttribute(
      "data-view-mode",
      "side-by-side",
    );
  });

  it("switching to unified does not lose alerts (CA-RF07-02)", async () => {
    const user = userEvent.setup();
    render(<DiffHarness />);
    expect(screen.getByTestId("alert-list").children).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /unified/i }));

    expect(screen.getByTestId("diff-viewer-body")).toHaveAttribute(
      "data-view-mode",
      "unified",
    );
    expect(screen.getByTestId("alert-list").children).toHaveLength(2);
    expect(screen.getByTestId("diff-viewer-body")).toHaveAttribute(
      "data-alerts-count",
      "2",
    );
    expect(screen.getByText("issue")).toBeInTheDocument();
    expect(screen.getByText("nit")).toBeInTheDocument();
  });
});

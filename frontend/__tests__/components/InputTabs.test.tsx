import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { InputTabs } from "@/components/Editor/InputTabs";
import type { EditorMode } from "@/hooks/useEditor";

function TabsHarness({
  initialMode = "manual",
  initialContent = "paste-me",
}: {
  initialMode?: EditorMode;
  initialContent?: string;
}) {
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [content] = useState(initialContent);
  return (
    <div>
      <InputTabs mode={mode} onModeChange={setMode} />
      <pre data-testid="session-content">{content}</pre>
      <span data-testid="active-mode">{mode}</span>
    </div>
  );
}

describe("InputTabs", () => {
  it("renders all three input tabs", () => {
    render(<TabsHarness />);
    expect(
      screen.getByRole("tab", { name: "Código Manual" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Upload Arquivo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "URL PR/MR" }),
    ).toBeInTheDocument();
  });

  it("active tab shows correct indicator", () => {
    render(<TabsHarness />);
    const manual = screen.getByRole("tab", { name: "Código Manual" });
    expect(manual).toHaveAttribute("aria-selected", "true");
    expect(manual.className).toMatch(/border-beacon/);
    expect(manual.className).toMatch(/bg-surface-l2/);
  });

  it("switching tabs preserves editor content (CA-RF01-01)", async () => {
    const user = userEvent.setup();
    render(<TabsHarness initialContent="kept-across-tabs" />);
    expect(screen.getByTestId("session-content")).toHaveTextContent(
      "kept-across-tabs",
    );
    await user.click(screen.getByRole("tab", { name: "Upload Arquivo" }));
    expect(screen.getByTestId("active-mode")).toHaveTextContent("upload");
    expect(screen.getByTestId("session-content")).toHaveTextContent(
      "kept-across-tabs",
    );
    await user.click(screen.getByRole("tab", { name: "Código Manual" }));
    expect(screen.getByTestId("session-content")).toHaveTextContent(
      "kept-across-tabs",
    );
  });
});

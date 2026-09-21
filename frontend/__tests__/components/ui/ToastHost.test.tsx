import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastHost } from "@/components/ui/ToastHost";

describe("ToastHost", () => {
  it("renders an accessible empty region by default", () => {
    render(<ToastHost />);
    const region = screen.getByRole("region", { name: "Notificações" });
    expect(region).toBeInTheDocument();
    expect(region.querySelectorAll('[role="status"]')).toHaveLength(0);
  });

  it("keeps message-only toasts without an action button", () => {
    render(
      <ToastHost items={[{ id: "1", message: "Só mensagem" }]} />,
    );
    expect(screen.getByText("Só mensagem")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Tentar Novamente" }),
    ).not.toBeInTheDocument();
  });

  it("fires onClick when Tentar Novamente is pressed (CA-RF10-03)", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(
      <ToastHost
        items={[
          {
            id: "err",
            message: "Timeout",
            action: { label: "Tentar Novamente", onClick },
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Tentar Novamente" }),
    );
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

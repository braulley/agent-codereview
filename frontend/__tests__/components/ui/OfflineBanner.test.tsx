import { act, render, screen } from "@testing-library/react";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

describe("OfflineBanner", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Navigator.prototype,
    "onLine",
  );

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(Navigator.prototype, "onLine", originalDescriptor);
    }
  });

  function setOnline(value: boolean) {
    Object.defineProperty(Navigator.prototype, "onLine", {
      configurable: true,
      get: () => value,
    });
  }

  it("shows banner when onLine is false", async () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(await screen.findByRole("status")).toHaveTextContent(/offline/i);
  });

  it("removes banner on online event (CA-RF10-04)", () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

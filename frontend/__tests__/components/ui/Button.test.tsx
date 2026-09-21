import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it.each(["primary", "secondary", "destructive"] as const)(
    "renders %s variant",
    (variant) => {
      render(<Button variant={variant}>{variant}</Button>);
      const btn = screen.getByRole("button", { name: variant });
      expect(btn).toBeInTheDocument();
      expect(btn.className).toMatch(/rounded-none/);
      if (variant === "primary") {
        expect(btn.className).toMatch(/bg-beacon/);
      }
      if (variant === "secondary") {
        expect(btn.className).toMatch(/bg-surface-l2/);
      }
      if (variant === "destructive") {
        expect(btn.className).toMatch(/bg-severity-critical/);
      }
    },
  );
});

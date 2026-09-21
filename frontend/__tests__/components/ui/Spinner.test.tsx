import { render, screen } from "@testing-library/react";
import { Spinner } from "@/components/ui/Spinner";

describe("Spinner", () => {
  it("exposes a loading status", () => {
    render(<Spinner />);
    expect(screen.getByRole("status", { name: "Carregando" })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout from "../app/layout";
import Home from "../app/page";

describe("Home / layout smoke", () => {
  it("applies next/font CSS variables on html and canvas on body", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <div>child</div>
      </RootLayout>,
    );

    expect(markup).toMatch(/lang="pt-BR"/);
    expect(markup).toMatch(/font-space-grotesk|--font-space-grotesk/);
    expect(markup).toMatch(/font-hanken-grotesk|--font-hanken-grotesk/);
    expect(markup).toMatch(/font-jetbrains-mono|--font-jetbrains-mono/);
    expect(markup).toMatch(/bg-canvas/);
  });

  it("renders the three-pane shell instead of the create-next-app boilerplate", () => {
    render(<Home />);
    expect(
      screen.getByRole("main", { name: "Central Stage" }),
    ).toBeInTheDocument();
    expect(screen.queryByAltText("Next.js logo")).not.toBeInTheDocument();
  });
});

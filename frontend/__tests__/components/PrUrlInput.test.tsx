import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { PrUrlInput } from "@/components/Editor/PrUrlInput";

function PrHarness() {
  const [content, setContent] = useState("");
  return (
    <div>
      <PrUrlInput
        onDiffLoaded={(diff) => {
          setContent(diff);
        }}
      />
      <pre data-testid="editor-content">{content}</pre>
    </div>
  );
}

describe("PrUrlInput", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("valid GitHub URL does not show INVALID_PR_URL before submit succeeds", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        diff_content: "diff --git a/a.py b/a.py\n",
        truncated: false,
      }),
    }) as unknown as typeof fetch;

    render(<PrHarness />);
    await user.type(
      screen.getByLabelText(/url do pull request/i),
      "https://github.com/acme/demo/pull/12",
    );
    await user.click(screen.getByRole("button", { name: /ingerir/i }));

    await waitFor(() => {
      expect(screen.getByTestId("editor-content")).toHaveTextContent(
        "diff --git",
      );
    });
    expect(screen.queryByTestId("pr-url-error")).not.toBeInTheDocument();
  });

  it("invalid pull/abc shows error and zero fetch (CT05)", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<PrHarness />);
    await user.type(
      screen.getByLabelText(/url do pull request/i),
      "https://github.com/user/repo/pull/abc",
    );
    await user.click(screen.getByRole("button", { name: /ingerir/i }));

    expect(await screen.findByTestId("pr-url-error")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mock 200 populates editor", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        diff_content: "+print(1)\n",
        truncated: false,
      }),
    }) as unknown as typeof fetch;

    render(<PrHarness />);
    await user.type(
      screen.getByLabelText(/url do pull request/i),
      "https://github.com/acme/demo/pull/1",
    );
    await user.click(screen.getByRole("button", { name: /ingerir/i }));

    await waitFor(() => {
      expect(screen.getByTestId("editor-content")).toHaveTextContent(
        "+print(1)",
      );
    });
  });

  it("mock truncated: true shows warning", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        diff_content: "+x\n",
        truncated: true,
      }),
    }) as unknown as typeof fetch;

    render(<PrHarness />);
    await user.type(
      screen.getByLabelText(/url do pull request/i),
      "https://github.com/acme/demo/pull/99",
    );
    await user.click(screen.getByRole("button", { name: /ingerir/i }));

    expect(await screen.findByTestId("pr-url-truncated")).toHaveTextContent(
      /truncado/i,
    );
    expect(screen.getByTestId("editor-content")).toHaveTextContent("+x");
  });
});

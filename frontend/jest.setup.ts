import "@testing-library/jest-dom";
import React from "react";
import { TextDecoder, TextEncoder } from "util";

Object.assign(globalThis, { TextEncoder, TextDecoder });

// jsdom may omit undici globals used by SSE stream tests (fetch Response body).
if (typeof globalThis.Response === "undefined") {
  // Minimal stub — tests that need a real body supply their own mock Response shape.
  (globalThis as typeof globalThis & { Response: typeof Response }).Response =
    class Response {
      ok: boolean;
      status: number;
      body: ReadableStream<Uint8Array> | null;
      constructor(
        body?: BodyInit | null,
        init?: ResponseInit,
      ) {
        this.status = init?.status ?? 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.body = null;
        void body;
      }
      async json(): Promise<unknown> {
        return {};
      }
    } as unknown as typeof Response;
}

// next/dynamic must resolve mocked editors synchronously in Jest.
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<unknown>) => {
    const src = loader.toString();
    if (src.includes("@monaco-editor/react")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("@monaco-editor/react").default;
    }
    if (src.includes("react-diff-viewer-continued")) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require("react-diff-viewer-continued").default;
    }
    const Fallback = () => null;
    Fallback.displayName = "DynamicFallback";
    return Fallback;
  },
}));

jest.mock("next/font/google", () => ({
  Space_Grotesk: () => ({
    className: "font-space-grotesk",
    variable: "font-space-grotesk",
    style: { fontFamily: "Space Grotesk" },
  }),
  Hanken_Grotesk: () => ({
    className: "font-hanken-grotesk",
    variable: "font-hanken-grotesk",
    style: { fontFamily: "Hanken Grotesk" },
  }),
  JetBrains_Mono: () => ({
    className: "font-jetbrains-mono",
    variable: "font-jetbrains-mono",
    style: { fontFamily: "JetBrains Mono" },
  }),
}));

jest.mock("@monaco-editor/react", () => {
  const MockEditor = ({
    value,
    onChange,
    language,
  }: {
    value?: string;
    onChange?: (value: string | undefined) => void;
    language?: string;
  }) =>
    React.createElement("textarea", {
      "data-testid": "monaco-mock",
      "data-language": language,
      value: value ?? "",
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        onChange?.(e.target.value),
    });
  return { __esModule: true, default: MockEditor, Editor: MockEditor };
});

jest.mock("react-diff-viewer-continued", () => {
  const MockDiff = ({
    oldValue,
    newValue,
    splitView,
    leftTitle,
    rightTitle,
  }: {
    oldValue?: string;
    newValue?: string;
    splitView?: boolean;
    leftTitle?: string;
    rightTitle?: string;
  }) =>
    React.createElement(
      "div",
      { "data-testid": "diff-lib-mock", "data-split": String(!!splitView) },
      splitView
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement("div", { "data-pane": "old" }, leftTitle),
            React.createElement("div", { "data-pane": "new" }, rightTitle),
            React.createElement("pre", null, oldValue),
            React.createElement("pre", null, newValue),
          )
        : React.createElement(
            "pre",
            { "data-unified": "true" },
            `${oldValue}\n---\n${newValue}`,
          ),
    );
  return { __esModule: true, default: MockDiff };
});

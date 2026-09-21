import { act, renderHook } from "@testing-library/react";
import {
  languageFromExtension,
  useEditor,
} from "@/hooks/useEditor";

describe("useEditor", () => {
  it("setContent updates editor state", () => {
    const { result } = renderHook(() => useEditor());
    act(() => {
      result.current.setContent("print('hi')");
    });
    expect(result.current.content).toBe("print('hi')");
  });

  it("setMode switches tab without clearing content", () => {
    const { result } = renderHook(() =>
      useEditor({ content: "kept", mode: "manual" }),
    );
    act(() => {
      result.current.setMode("upload");
    });
    expect(result.current.mode).toBe("upload");
    expect(result.current.content).toBe("kept");
    act(() => {
      result.current.setMode("url");
    });
    expect(result.current.content).toBe("kept");
  });

  it("language is inferable from file extension", () => {
    expect(languageFromExtension("app.py")).toBe("python");
    expect(languageFromExtension("main.ts")).toBe("typescript");
    expect(languageFromExtension("lib.go")).toBe("go");
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { FileUpload } from "@/components/Editor/FileUpload";
import type { EditorLanguage } from "@/hooks/useEditor";

function UploadHarness({
  initialContent = "original",
}: {
  initialContent?: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [language, setLanguage] = useState<EditorLanguage>("typescript");
  return (
    <div>
      <FileUpload
        onLoaded={(next, lang) => {
          setContent(next);
          setLanguage(lang);
        }}
      />
      <pre data-testid="editor-content">{content}</pre>
      <span data-testid="editor-language">{language}</span>
    </div>
  );
}

describe("FileUpload integration", () => {
  const OriginalFileReader = global.FileReader;

  afterEach(() => {
    global.FileReader = OriginalFileReader;
  });

  it("uploading .py file populates editor (CA-RF01-02)", async () => {
    const user = userEvent.setup();
    class MockFileReader {
      result: string | null = null;
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      readAsText(_file: Blob) {
        void _file;
        this.result = "def hello():\n  return 1\n";
        this.onload?.({} as ProgressEvent<FileReader>);
      }
    }
    global.FileReader = MockFileReader as unknown as typeof FileReader;

    render(<UploadHarness />);
    const input = screen.getByLabelText(/upload de arquivo/i);
    const file = new File(["def hello():\n  return 1\n"], "app.py", {
      type: "text/x-python",
    });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByTestId("editor-content")).toHaveTextContent(
        "def hello()",
      );
    });
    expect(screen.getByTestId("editor-language")).toHaveTextContent("python");
  });

  it("unsupported extension shows error and keeps content", async () => {
    const readAsText = jest.fn();
    class MockFileReader {
      result: string | null = null;
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      readAsText = readAsText;
    }
    global.FileReader = MockFileReader as unknown as typeof FileReader;

    render(<UploadHarness initialContent="keep-me" />);
    const input = screen.getByLabelText(/upload de arquivo/i);
    const file = new File(["binary"], "malware.exe", {
      type: "application/octet-stream",
    });
    // fireEvent bypasses accept= filtering so we can assert rejection logic
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /extensão não suportada/i,
    );
    expect(screen.getByTestId("editor-content")).toHaveTextContent("keep-me");
    expect(readAsText).not.toHaveBeenCalled();
  });
});

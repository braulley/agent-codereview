"use client";

import { useRef, useState } from "react";
import { languageFromExtension } from "@/hooks/useEditor";
import type { EditorLanguage } from "@/hooks/useEditor";
import {
  ALLOWED_EXTENSIONS,
  isAllowedExtension,
} from "@/lib/file-extensions";

type FileUploadProps = {
  onLoaded: (content: string, language: EditorLanguage) => void;
};

export function FileUpload({ onLoaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(fileList: FileList | null) {
    setError(null);
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    if (!isAllowedExtension(file.name)) {
      setError(
        `Extensão não suportada. Use: ${ALLOWED_EXTENSIONS.join(", ")}`,
      );
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      onLoaded(text, languageFromExtension(file.name));
    };
    reader.onerror = () => {
      setError("Não foi possível ler o arquivo.");
    };
    reader.readAsText(file);
  }

  return (
    <div
      id="input-tab-panel"
      role="tabpanel"
      aria-labelledby="input-tab-upload"
      className="border border-t-0 border-hairline bg-surface-l2 p-3"
    >
      <label className="font-display block text-xs uppercase tracking-wide text-gray-400">
        Selecionar arquivo
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(",")}
          className="mt-2 block w-full font-mono text-sm text-gray-200 file:mr-3 file:rounded-none file:border file:border-hairline-strong file:bg-surface-l1 file:px-3 file:py-1 file:font-display file:text-xs file:uppercase file:text-beacon"
          onChange={(e) => handleChange(e.target.files)}
          aria-label="Upload de arquivo de código"
        />
      </label>
      {error ? (
        <p
          role="alert"
          className="mt-2 font-sans text-sm text-severity-critical"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { DIFF_INGEST } from "@/lib/api-paths";
import { validatePrUrl } from "@/lib/pr-url-validator";

type PrUrlInputProps = {
  onDiffLoaded: (diffContent: string, truncated: boolean) => void;
};

type IngestSuccess = {
  diff_content: string;
  truncated?: boolean;
};

type IngestError = {
  error?: string;
  message?: string;
  detail?: string;
};

export function PrUrlInput({ onDiffLoaded }: PrUrlInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [truncationWarning, setTruncationWarning] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setTruncationWarning(null);

    const result = validatePrUrl(url);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setLoading(true);
    try {
      // Contract: docs/spec.md §RF09 — body field is `url` (not pr_url).
      const response = await fetch(DIFF_INGEST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = (await response.json()) as IngestSuccess & IngestError;

      if (!response.ok) {
        setError(
          data.message ??
            data.error ??
            "Falha ao ingerir o diff do PR/MR.",
        );
        return;
      }

      const truncated = Boolean(data.truncated);
      if (truncated) {
        setTruncationWarning(
          "Diff truncado: o PR/MR excede 500 linhas. Apenas o trecho inicial foi carregado.",
        );
      }
      onDiffLoaded(data.diff_content ?? "", truncated);
    } catch {
      setError("Falha de rede ao chamar /api/diff/ingest.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      id="input-tab-panel"
      role="tabpanel"
      aria-labelledby="input-tab-url"
      className="border border-t-0 border-hairline bg-surface-l2 p-3"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <label className="font-display flex-1 text-xs uppercase tracking-wide text-gray-400">
          URL do PR/MR
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/123"
            className="mt-1 w-full rounded-none border border-hairline-strong bg-canvas px-3 py-2 font-mono text-sm normal-case text-gray-100 placeholder:text-gray-600"
            aria-label="URL do Pull Request ou Merge Request"
            aria-invalid={error ? true : undefined}
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={loading} variant="primary">
            {loading ? "Carregando…" : "Ingerir"}
          </Button>
        </div>
      </form>
      {error ? (
        <p
          role="alert"
          data-testid="pr-url-error"
          className="mt-2 font-sans text-sm text-severity-critical"
        >
          {error}
        </p>
      ) : null}
      {truncationWarning ? (
        <p
          role="status"
          data-testid="pr-url-truncated"
          className="mt-2 font-sans text-sm text-severity-medium"
        >
          {truncationWarning}
        </p>
      ) : null}
    </div>
  );
}

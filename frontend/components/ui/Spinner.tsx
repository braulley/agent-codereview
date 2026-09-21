type SpinnerProps = {
  label?: string;
};

export function Spinner({ label = "Carregando" }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="inline-flex items-center gap-2"
    >
      <span
        className="inline-block size-4 animate-spin rounded-none border-2 border-hairline-strong border-t-beacon"
        aria-hidden
      />
      <span className="font-mono text-xs text-gray-400">{label}</span>
    </div>
  );
}

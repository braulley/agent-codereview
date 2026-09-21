export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastItem = {
  id: string;
  message: string;
  action?: ToastAction;
};

type ToastHostProps = {
  items?: ToastItem[];
};

/** Toast host — RF10 / C11 optional retry action. */
export function ToastHost({ items = [] }: ToastHostProps) {
  return (
    <div
      role="region"
      aria-label="Notificações"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className="pointer-events-auto border border-hairline-strong bg-surface-l2 px-3 py-2 font-sans text-sm text-gray-100"
        >
          <p>{item.message}</p>
          {item.action ? (
            <button
              type="button"
              className="font-display mt-2 border border-hairline-strong bg-surface-l2 px-3 py-1 text-xs uppercase tracking-wide text-beacon"
              onClick={item.action.onClick}
            >
              {item.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

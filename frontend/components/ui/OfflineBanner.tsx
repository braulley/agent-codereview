"use client";

import { useEffect, useState } from "react";

/**
 * Offline connectivity banner (CA-RF10-04).
 * Permanent while `navigator.onLine` is false — not auto-dismissed.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine);
    }
    function onOffline() {
      setOffline(true);
    }
    function onOnline() {
      setOffline(false);
    }
    sync();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="shrink-0 border-b border-hairline-strong bg-surface-l2 px-4 py-2"
    >
      <p className="font-display text-xs uppercase tracking-wide text-beacon">
        Sem conexão
      </p>
      <p className="font-sans text-sm text-gray-300">
        Você está offline. A análise ficará indisponível até a conexão
        restaurar.
      </p>
    </div>
  );
}

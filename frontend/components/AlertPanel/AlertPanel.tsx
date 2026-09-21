"use client";

import { AlertCard } from "@/components/AlertPanel/AlertCard";
import type { SessionAlert } from "@/hooks/useAlerts";

export type AlertPanelProps = {
  alerts: SessionAlert[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onApplyFix?: (id: string) => void;
  applyDisabled?: boolean;
};

export function AlertPanel({
  alerts,
  activeId = null,
  onSelect,
  onApplyFix,
  applyDisabled = false,
}: AlertPanelProps) {
  if (alerts.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-full min-h-[8rem] items-center justify-center p-4"
      >
        <p className="font-sans text-sm text-gray-400">
          Nenhum problema encontrado
        </p>
      </div>
    );
  }

  return (
    <div
      aria-label="Alert panel"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
    >
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          active={activeId === alert.id}
          onSelect={onSelect}
          onApplyFix={onApplyFix}
          applyDisabled={applyDisabled}
        />
      ))}
    </div>
  );
}

import type { ReactNode } from "react";

import { TimeWindowSelector } from "./TimeWindowSelector";
import { SectionCard } from "./Panel";
import type { TimeWindow } from "../types/api";

interface MonitorPanelProps {
  title: string;
  subtitle: string;
  window: TimeWindow;
  onWindowChange: (value: TimeWindow) => void;
  children: ReactNode;
}

/**
 * Wraps monitor content with a shared time-window affordance so read-only
 * panels can stay composable while exposing the same exploration pattern.
 */
export function MonitorPanel({
  title,
  subtitle,
  window,
  onWindowChange,
  children,
}: MonitorPanelProps) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="monitor-panel-body">{children}</div>
      <div className="monitor-panel-footer">
        <TimeWindowSelector value={window} onChange={onWindowChange} />
      </div>
    </SectionCard>
  );
}

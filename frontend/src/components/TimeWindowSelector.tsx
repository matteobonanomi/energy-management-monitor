import { formatTimeWindowLabel } from "../lib/format";
import type { TimeWindow } from "../types/api";

const windowOptions: TimeWindow[] = ["1w", "2w", "1m", "max"];

interface TimeWindowSelectorProps {
  value: TimeWindow;
  onChange: (value: TimeWindow) => void;
}

/**
 * Normalizes historical-depth switching so every monitor panel exposes the
 * same exploration cadence with minimal repeated wiring.
 */
export function TimeWindowSelector({
  value,
  onChange,
}: TimeWindowSelectorProps) {
  return (
    <div className="window-selector" role="group" aria-label="Time window">
      {windowOptions.map((option) => (
        <button
          key={option}
          type="button"
          className={option === value ? "window-button is-active" : "window-button"}
          onClick={() => onChange(option)}
        >
          {formatTimeWindowLabel(option)}
        </button>
      ))}
    </div>
  );
}

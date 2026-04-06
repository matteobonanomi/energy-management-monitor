interface LoadingBatteryProps {
  label: string;
}

export function LoadingBattery({ label }: LoadingBatteryProps) {
  return (
    <div className="loading-battery" aria-live="polite" role="status">
      <div className="loading-battery-shell" aria-hidden="true">
        <span className="loading-battery-level loading-battery-level-1" />
        <span className="loading-battery-level loading-battery-level-2" />
        <span className="loading-battery-level loading-battery-level-3" />
        <span className="loading-battery-level loading-battery-level-4" />
      </div>
      <p>{label}</p>
    </div>
  );
}

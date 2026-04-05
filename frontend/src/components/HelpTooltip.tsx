interface HelpTooltipProps {
  label: string;
  text: string;
}

export function HelpTooltip({ label, text }: HelpTooltipProps) {
  return (
    <span className="help-tooltip">
      <button
        type="button"
        className="help-tooltip-trigger"
        aria-label={label}
      >
        ?
      </button>
      <span className="help-tooltip-content" role="tooltip">
        {text}
      </span>
    </span>
  );
}

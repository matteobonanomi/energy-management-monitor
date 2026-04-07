import { SectionCard } from "./Panel";

interface PlaceholderPanelProps {
  title: string;
}

/**
 * Reserves future dashboard space without forcing unfinished modules into the
 * main interaction paths.
 */
export function PlaceholderPanel({ title }: PlaceholderPanelProps) {
  return (
    <SectionCard title={title} subtitle="Spazio riservato ai prossimi moduli.">
      <div className="placeholder-box" />
    </SectionCard>
  );
}

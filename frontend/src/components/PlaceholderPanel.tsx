import { SectionCard } from "./Panel";

interface PlaceholderPanelProps {
  title: string;
}

export function PlaceholderPanel({ title }: PlaceholderPanelProps) {
  return (
    <SectionCard title={title} subtitle="Spazio riservato ai prossimi moduli.">
      <div className="placeholder-box" />
    </SectionCard>
  );
}

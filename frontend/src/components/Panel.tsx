import type { ReactNode } from "react";

interface SectionCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}

export function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
}: SectionCardProps) {
  return (
    <section className="card panel-card">
      <div className="panel-header">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2>{title}</h2>
          {subtitle ? <p className="muted panel-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

interface StatePanelProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function LoadingPanel({ title, message }: StatePanelProps) {
  return (
    <SectionCard title={title}>
      <div className="state-panel state-panel-loading">
        <div className="state-orb" />
        <p>{message}</p>
      </div>
    </SectionCard>
  );
}

export function ErrorPanel({
  title,
  message,
  actionLabel,
  onAction,
}: StatePanelProps) {
  return (
    <SectionCard title={title}>
      <div className="state-panel state-panel-error">
        <p>{message}</p>
        {actionLabel && onAction ? (
          <button type="button" className="ghost-button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </SectionCard>
  );
}

export function EmptyPanel({
  title,
  message,
  actionLabel,
  onAction,
}: StatePanelProps) {
  return (
    <SectionCard title={title}>
      <div className="state-panel">
        <p>{message}</p>
        {actionLabel && onAction ? (
          <button type="button" className="ghost-button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </SectionCard>
  );
}

import type { ReactNode } from "react";

interface SectionCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standardizes panel framing so dense dashboard content keeps a predictable
 * rhythm across monitors, KPI blocks, and narrative sections.
 */
export function SectionCard({
  eyebrow,
  title,
  subtitle,
  children,
  actions,
  className,
}: SectionCardProps) {
  return (
    <section className={className ? `card panel-card ${className}` : "card panel-card"}>
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

/**
 * Makes loading explicit at panel level so the grid can degrade gracefully
 * while upstream data is still resolving.
 */
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

/**
 * Gives retryable failures a consistent treatment so recovery affordances do
 * not have to be reinvented in each feature module.
 */
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

/**
 * Reserves space for valid but currently unpopulated states without implying
 * that the panel failed to load.
 */
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

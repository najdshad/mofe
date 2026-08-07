interface PanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, subtitle, children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-[var(--radius-panel)] border border-line/90 bg-panel shadow-[0_1px_2px_rgba(17,17,17,0.03)] ${className}`}
    >
      <div className="border-b border-line/80 px-5 py-4">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

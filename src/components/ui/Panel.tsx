interface PanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, subtitle, children, className = "" }: PanelProps) {
  return (
    <section
      className={`rounded-[var(--radius-panel)] border border-line bg-paper ${className}`}
    >
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-serif text-lg text-ink">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">
            {subtitle}
          </p>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

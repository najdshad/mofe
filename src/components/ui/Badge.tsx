interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "muted" | "soldOut" | "hidden";
}

export function Badge({
  children,
  variant = "default",
}: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] leading-none tracking-wide";

  if (variant === "soldOut") {
    return (
      <span className={`${base} border-ink text-ink`}>{children}</span>
    );
  }

  if (variant === "muted") {
    return (
      <span className={`${base} border-line text-ink-muted`}>{children}</span>
    );
  }

  return <span className={`${base} border-ink text-ink`}>{children}</span>;
}

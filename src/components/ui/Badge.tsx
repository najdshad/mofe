interface BadgeProps {
  children: React.ReactNode;
  muted?: boolean;
  variant?: "default" | "soldOut" | "hidden";
}

export function Badge({
  children,
  muted = false,
  variant = "default",
}: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] leading-none tracking-wide";

  if (variant === "soldOut") {
    return (
      <span
        className={`${base} border-ink text-ink`}
      >
        {children}
      </span>
    );
  }

  if (muted) {
    return (
      <span className={`${base} border-line text-ink-muted`}>{children}</span>
    );
  }

  return <span className={`${base} border-ink text-ink`}>{children}</span>;
}

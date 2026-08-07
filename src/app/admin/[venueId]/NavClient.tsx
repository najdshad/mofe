"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Settings2, UtensilsCrossed } from "lucide-react";

export function NavClient({
  venueId,
  variant,
}: {
  venueId: string;
  variant: "sidebar" | "mobile";
}) {
  const pathname = usePathname();

  const links = [
    {
      href: `/admin/${venueId}/menu`,
      label: "مدیریت منو",
      shortLabel: "منو",
      icon: UtensilsCrossed,
    },
    {
      href: `/admin/${venueId}/settings`,
      label: "تنظیمات مجموعه",
      shortLabel: "تنظیمات",
      icon: Settings2,
    },
  ];

  if (variant === "mobile") {
    return (
      <nav className="grid grid-cols-2 border-t border-line/80 bg-panel/95 px-3 py-2 backdrop-blur">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                isActive ? "bg-ink text-paper" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.8} />
              {link.shortLabel}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1.5">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-ink text-paper shadow-sm"
                : "text-ink-muted hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

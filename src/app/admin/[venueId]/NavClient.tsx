"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export function NavClient({ venueId }: { venueId: string }) {
  const pathname = usePathname();

  const links = [
    { href: `/admin/${venueId}/menu`, label: "منو" },
    { href: `/admin/${venueId}/settings`, label: "تنظیمات" },
  ];

  return (
    <div className="mx-auto flex max-w-5xl gap-4 px-4">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`border-b-2 px-1 py-2.5 text-sm transition-colors ${
              isActive
                ? "border-ink text-ink"
                : "border-transparent text-ink-muted hover:border-ink hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

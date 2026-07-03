"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  draft: "پیش‌نویس",
  published: "منتشر شده",
  unpublished: "منتشر نشده",
};

export function VenueStatusBadge({
  venueId,
  initialStatus,
}: {
  venueId: string;
  initialStatus: string;
}) {
  const pathname = usePathname();
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    fetch(`/api/venues/${venueId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.publicStatus) setStatus(data.publicStatus);
      })
      .catch(() => {});
  }, [venueId, pathname]);

  return (
    <span className="rounded-full border border-line px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-muted">
      {LABELS[status] || status}
    </span>
  );
}

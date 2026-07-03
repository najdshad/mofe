"use client";

import { Panel } from "@/components/ui/Panel";

interface Publication {
  id: string;
  status: string;
  trigger: string;
  createdAt: string;
  createdAtLabel: string;
}

const statusLabels: Record<string, string> = {
  queued: "در صف",
  published: "منتشر شده",
  unpublished: "منتشر نشده",
};

const statusVariants: Record<string, string> = {
  queued: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  unpublished: "bg-red-100 text-red-800",
};

const triggerLabels: Record<string, string> = {
  manual_publish: "انتشار",
  manual_unpublish: "لغو انتشار",
};

export function PublicationsClient({
  publications,
}: {
  publications: Publication[];
}) {
  return (
    <div className="max-w-xl">
      <Panel title="تاریخچه انتشار" subtitle="فهرست انتشارهای قبلی منو">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
          <div className="grid grid-cols-[1fr_100px_1fr] gap-2 border-b border-line bg-surface px-3 py-2.5 text-[11px] uppercase tracking-wider text-ink-muted">
            <div>تاریخ</div>
            <div>وضعیت</div>
            <div>علت</div>
          </div>
          {publications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-ink-muted">
              هیچ انتشاری یافت نشد
            </div>
          ) : (
            publications.map((pub, idx) => (
              <div
                key={pub.id}
                className={`grid grid-cols-[1fr_100px_1fr] items-center gap-2 px-3 py-3 ${
                  idx !== publications.length - 1 ? "border-b border-line/50" : ""
                }`}
              >
              <div className="text-sm text-ink">
                {pub.createdAtLabel}
              </div>
              <div>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    statusVariants[pub.status] ?? "bg-gray-100 text-gray-800"
                  }`}
                >
                  {statusLabels[pub.status] ?? pub.status}
                </span>
              </div>
              <div className="text-sm text-ink-muted">
                {triggerLabels[pub.trigger] ?? pub.trigger}
              </div>
            </div>
          ))
        )}
        </div>
      </Panel>
    </div>
  );
}

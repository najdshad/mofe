"use client";

import { Panel } from "@/components/ui/Panel";

interface Publication {
  id: string;
  status: string;
  trigger: string;
  createdAt: string;
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
  publish: "انتشار",
  unpublish: "لغو انتشار",
};

export function PublicationsClient({
  publications,
}: {
  publications: Publication[];
}) {
  return (
    <Panel title="تاریخچه انتشارات" subtitle="فهرست انتشارات قبلی منو">
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
        <div className="grid grid-cols-[1fr_120px_1fr] gap-3 border-b border-line bg-surface px-4 py-3 text-[11px] uppercase tracking-wider text-ink-muted">
          <div>تاریخ</div>
          <div>وضعیت</div>
          <div>علت</div>
        </div>
        {publications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-ink-muted">
            هیچ انتشاراتی یافت نشد
          </div>
        ) : (
          publications.map((pub, idx) => (
            <div
              key={pub.id}
              className={`grid grid-cols-[1fr_120px_1fr] items-center gap-3 px-4 py-4 ${
                idx !== publications.length - 1 ? "border-b border-line/50" : ""
              }`}
            >
              <div className="text-sm text-ink">
                {new Date(pub.createdAt).toLocaleDateString("fa-IR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
  );
}

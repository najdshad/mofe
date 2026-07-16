"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { OrderData } from "./types";

const statusBadge: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "پیش‌نویس", className: "bg-gray-100 text-gray-600" },
  PENDING: { label: "در انتظار", className: "bg-gray-100 text-gray-600" },
  SENT: { label: "ارسال شده", className: "bg-amber-100 text-amber-700" },
  PREPARING: { label: "در حال آماده‌سازی", className: "bg-blue-100 text-blue-700" },
  READY: { label: "آماده", className: "bg-green-100 text-green-700" },
  DELIVERED: { label: "تحویل شده", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "لغو شده", className: "bg-red-100 text-red-700" },
};

export function OrderPanel({
  order,
  onAddItem,
  onSendToKitchen,
  onCompleteOrder,
  onItemStatus,
  onUpdateItem,
  onCancelItem,
  onReleaseTable,
  loading,
  error,
}: {
  order: OrderData;
  onAddItem: () => void;
  onSendToKitchen: () => void;
  onCompleteOrder: () => void;
  onItemStatus: (itemId: string, status: string) => void;
  onUpdateItem: (itemId: string, quantity: number, notes?: string) => void;
  onCancelItem: (itemId: string) => void;
  onReleaseTable?: () => void;
  loading?: { send?: boolean; complete?: boolean };
  error?: string | null;
}) {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editNotesValue, setEditNotesValue] = useState("");

  const tableLabel = order.tableNumber ? `میز ${order.tableNumber}` : "";
  const badge = statusBadge[order.status] || statusBadge.PENDING;
  const items = order.items || [];
  const hasPendingItems = items.some((i) => i.status === "PENDING");
  const canSend = items.length > 0 && (order.status === "PENDING" || hasPendingItems);
  const allDelivered = items.length > 0 && items.every(
    (i) => i.status === "DELIVERED" || i.status === "CANCELLED"
  );
  const canComplete = allDelivered && order.status !== "COMPLETED" && order.status !== "CANCELLED";

  const nextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case "SENT": return "PREPARING";
      case "PREPARING": return "READY";
      case "READY": return "DELIVERED";
      default: return null;
    }
  };

  const nextStatusLabel = (status: string): string => {
    switch (status) {
      case "PREPARING": return "در حال تهیه";
      case "READY": return "آماده شد";
      case "DELIVERED": return "تحویل شد";
      default: return "";
    }
  };

  return (
    <div className="flex h-full flex-col rounded-[var(--radius-panel)] border border-line bg-paper transition-all duration-300">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-serif text-ink-strong">{tableLabel}</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {items.length === 0 ? (
          <p className="text-sm text-ink-muted">هیچ آیتمی اضافه نشده است</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const next = nextStatus(item.status);
              const itemBadge = statusBadge[item.status] || statusBadge.PENDING;
              const canEdit = item.status === "PENDING" || item.status === "SENT";
              return (
                <div
                  key={item.id}
                  className="rounded-[var(--radius-control)] border border-line p-3 transition-colors hover:bg-surface/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">
                        {item.menuItemName}
                        {item.variantName ? ` (${item.variantName})` : ""}
                      </p>
                      {editingNotesId === item.id ? (
                        <div className="mt-1 flex items-start gap-1">
                          <textarea
                            value={editNotesValue}
                            onChange={(e) => setEditNotesValue(e.target.value)}
                            rows={2}
                            className="flex-1 resize-none rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1 text-xs text-ink outline-none transition-colors focus:border-ink"
                          />
                          <div className="flex shrink-0 flex-col gap-1">
                            <button
                              onClick={() => {
                                onUpdateItem(item.id, item.quantity, editNotesValue || undefined);
                                setEditingNotesId(null);
                              }}
                              className="rounded border border-line px-2 py-0.5 text-[10px] text-ink transition-colors hover:bg-surface"
                            >
                              ذخیره
                            </button>
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="rounded border border-line px-2 py-0.5 text-[10px] text-ink-muted transition-colors hover:bg-surface"
                            >
                              لغو
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-0.5 flex items-start gap-1">
                          {item.notes ? (
                            <p className="flex-1 text-xs text-ink-muted">{item.notes}</p>
                          ) : null}
                          {canEdit && (
                            <button
                              onClick={() => {
                                setEditingNotesId(item.id);
                                setEditNotesValue(item.notes || "");
                              }}
                              className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-muted transition-colors hover:bg-surface"
                              aria-label="ویرایش توضیحات"
                            >
                              {item.notes ? "ویرایش" : "+ توضیحات"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${itemBadge.className}`}>
                      {itemBadge.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateItem(item.id, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-sm text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                          aria-label="افزایش تعداد"
                        >
                          +
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-medium text-ink" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            if (item.quantity <= 1) {
                              onCancelItem(item.id);
                            } else {
                              onUpdateItem(item.id, item.quantity - 1);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-sm text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                          aria-label="کاهش تعداد"
                        >
                          −
                        </button>
                        <span className="mr-2 text-xs text-ink-muted">
                          × {item.unitPrice.toLocaleString("fa-IR")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-muted">
                        {item.quantity} × {item.unitPrice.toLocaleString("fa-IR")}
                      </span>
                    )}
                    <span className="text-sm font-medium text-ink">
                      {item.totalPrice.toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {next && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onItemStatus(item.id, next)}
                      >
                        {nextStatusLabel(next)}
                      </Button>
                    )}
                    {(canEdit || item.status === "PREPARING") && (
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => onCancelItem(item.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        لغو
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        {error && (
          <div role="alert" aria-live="polite" className="mb-3 rounded-[var(--radius-control)] bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-ink-muted">جمع کل</span>
          <span className="font-medium text-ink">
            {order.total.toLocaleString("fa-IR")} تومان
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={onAddItem}
            className="w-full"
          >
            افزودن آیتم
          </Button>
          {canSend && (
            <Button
              variant="primary"
              onClick={onSendToKitchen}
              className="w-full"
              disabled={loading?.send}
            >
              {loading?.send ? "..." : "ارسال به آشپزخانه"}
            </Button>
          )}
          {canComplete && (
            <Button
              variant="primary"
              onClick={onCompleteOrder}
              className="w-full bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700 text-white"
              disabled={loading?.complete}
            >
              {loading?.complete ? "..." : "تسویه حساب"}
            </Button>
          )}
          {onReleaseTable && (
            <Button
              variant="tertiary"
              onClick={onReleaseTable}
              className="w-full text-ink-muted hover:text-red-600 border border-line"
            >
              آزاد سازی میز
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

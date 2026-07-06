"use client";

interface OrderItem {
  id: string;
  menuItemName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  notes?: string;
}

interface Order {
  id: string;
  tableNumber?: string;
  status: string;
  subtotal: number;
  total: number;
  items: OrderItem[];
  createdBy: string;
}

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
  onCancelItem,
}: {
  order: Order;
  onAddItem: () => void;
  onSendToKitchen: () => void;
  onCompleteOrder: () => void;
  onItemStatus: (itemId: string, status: string) => void;
  onCancelItem: (itemId: string) => void;
}) {
  const tableLabel = order.tableNumber ? `میز ${order.tableNumber}` : "";
  const badge = statusBadge[order.status] || statusBadge.PENDING;
  const canSend = order.status === "DRAFT" || order.status === "PENDING";
  const allDelivered = order.items.length > 0 && order.items.every(
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
    <div className="flex h-full flex-col rounded-[var(--radius-panel)] border border-line bg-paper">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-serif text-ink-strong">{tableLabel}</h2>
          <span className={`rounded-full px-2.5 py-0.5 text-xs ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {order.items.length === 0 ? (
          <p className="text-sm text-ink-muted">هیچ آیتمی اضافه نشده است</p>
        ) : (
          <div className="flex flex-col gap-3">
            {order.items.map((item) => {
              const next = nextStatus(item.status);
              const itemBadge = statusBadge[item.status] || statusBadge.PENDING;
              return (
                <div
                  key={item.id}
                  className="rounded-[var(--radius-control)] border border-line p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {item.menuItemName}
                        {item.variantName ? ` (${item.variantName})` : ""}
                      </p>
                      {item.notes && (
                        <p className="mt-0.5 text-xs text-ink-muted">{item.notes}</p>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${itemBadge.className}`}>
                      {itemBadge.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-ink-muted">
                      {item.quantity} × {item.unitPrice.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-sm font-medium text-ink">
                      {item.totalPrice.toLocaleString("fa-IR")} تومان
                    </span>
                  </div>
                  {next && (
                    <button
                      onClick={() => onItemStatus(item.id, next)}
                      className="mt-2 rounded bg-ink px-3 py-1 text-xs text-paper transition-opacity hover:opacity-90"
                    >
                      {nextStatusLabel(next)}
                    </button>
                  )}
                  {(item.status === "SENT" || item.status === "PREPARING") && (
                    <button
                      onClick={() => onCancelItem(item.id)}
                      className="mr-2 mt-2 text-xs text-red-500 hover:text-red-600 transition-colors"
                    >
                      لغو
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-line px-4 py-3">
        <div className="flex justify-between text-sm">
          <span className="text-ink-muted">جمع کل</span>
          <span className="font-medium text-ink">
            {order.total.toLocaleString("fa-IR")} تومان
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <button
            onClick={onAddItem}
            className="w-full rounded-[var(--radius-control)] border border-line bg-paper px-4 py-2 text-sm text-ink transition-colors hover:bg-surface"
          >
            افزودن آیتم
          </button>
          {canSend && (
            <button
              onClick={onSendToKitchen}
              className="w-full rounded-[var(--radius-control)] bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
            >
              ارسال به آشپزخانه
            </button>
          )}
          {canComplete && (
            <button
              onClick={onCompleteOrder}
              className="w-full rounded-[var(--radius-control)] bg-green-600 px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
            >
              تسویه حساب
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

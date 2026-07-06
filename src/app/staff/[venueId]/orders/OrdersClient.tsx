"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { TableGrid, type TableInfo } from "@/components/orders/TableGrid";
import { OrderPanel } from "@/components/orders/OrderPanel";
import { MenuItemBrowser } from "@/components/orders/MenuItemBrowser";
import { useOrderWebSocket } from "@/lib/useOrderWebSocket";

interface TableData {
  id: string;
  number: number;
  label?: string;
  status: string;
}

interface VariantData {
  id: string;
  nameFa: string;
  nameEn?: string;
  priceModifier: number;
}

interface MenuItemData {
  id: string;
  nameFa: string;
  nameEn?: string;
  priceToman: number;
  station: string;
  isSoldOut: boolean;
  variants: VariantData[];
}

interface CategoryData {
  id: string;
  nameFa: string;
  items: MenuItemData[];
}

interface OrderItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  station: string;
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
  createdAt: string;
  createdBy: string;
}

type TableStatus = "free" | "active" | "ready" | "settled";

export function OrdersClient({
  venueId,
  tables,
  categories,
}: {
  venueId: string;
  tables: TableData[];
  categories: CategoryData[];
}) {
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [orders, setOrders] = useState<Map<string, Order>>(new Map());
  const [tableStatuses, setTableStatuses] = useState<Map<number, TableStatus>>(new Map());
  const [showMenuBrowser, setShowMenuBrowser] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch active orders on mount
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchInitialOrders() {
      try {
        const [ordersRes, tablesRes] = await Promise.all([
          fetch(`/api/venues/${venueId}/orders?status=SENT`),
          tables.length > 0 ? null : null,
        ]);
        const orderMap = new Map<string, Order>();
        const statusMap = new Map<number, TableStatus>(
          tables.map((t) => [t.number, (t.status as TableStatus) || "free"]),
        );

        if (ordersRes?.ok) {
          const data: Order[] = await ordersRes.json();
          for (const order of data) {
            orderMap.set(order.id, order);
            if (order.tableNumber) {
              const tn = parseInt(order.tableNumber, 10);
              if (!isNaN(tn) && order.items.some((i) => i.status !== "DELIVERED" && i.status !== "CANCELLED")) {
                statusMap.set(tn, "active");
              }
            }
          }
        }
        setOrders(orderMap);
        setTableStatuses(statusMap);
      } catch {
        // silently fail
      }
    }
    fetchInitialOrders();
  }, [venueId, tables]);

  // Derive activeOrderId from selection + orders
  const activeOrderId = useMemo(() => {
    if (selectedTableNumber === null) return null;
    for (const [orderId, order] of orders) {
      if (order.tableNumber === String(selectedTableNumber)) {
        return orderId;
      }
    }
    return null;
  }, [selectedTableNumber, orders]);

  // WebSocket event handler
  const onWSEvent = useCallback((event: { type: string; payload: unknown }) => {
    const p = event.payload as Record<string, unknown>;

    if (event.type === "order_created") {
      if (p.tableNumber) {
        const tn = Number(p.tableNumber);
        setTableStatuses((prev) => {
          const next = new Map(prev);
          next.set(tn, "active");
          return next;
        });
      }
    }

    if (event.type === "order_completed") {
      setOrders((prev) => {
        const next = new Map(prev);
        next.delete(p.orderId as string);
        return next;
      });
      if (p.tableNumber) {
        const tn = Number(p.tableNumber);
        setTableStatuses((prev) => {
          const next = new Map(prev);
          next.set(tn, "settled");
          return next;
        });
      }
    }

    if (["item_added", "item_updated", "item_cancelled", "item_status_changed"].includes(event.type)) {
      const orderId = p.orderId as string;
      if (orderId) {
        fetch(`/api/venues/${venueId}/orders/${orderId}`)
          .then((res) => res.json())
          .then((order: Order) => {
            setOrders((prev) => {
              const next = new Map(prev);
              next.set(orderId, order);
              return next;
            });
            if (order.tableNumber) {
              const tn = parseInt(order.tableNumber, 10);
              if (!isNaN(tn)) {
                const allDelivered = order.items.length > 0 && order.items.every(
                  (i) => i.status === "DELIVERED" || i.status === "CANCELLED"
                );
                setTableStatuses((prev) => {
                  const next = new Map(prev);
                  next.set(tn, allDelivered ? "ready" : "active");
                  return next;
                });
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [venueId]);

  useOrderWebSocket(venueId, onWSEvent);

  const tableInfoList: TableInfo[] = tables.map((t) => ({
    tableNumber: t.number,
    tableId: t.id,
    status: tableStatuses.get(t.number) || "free",
  }));

  async function persistTableStatus(tableNumber: number, status: TableStatus) {
    const table = tables.find((t) => t.number === tableNumber);
    if (!table) return;
    try {
      await fetch(`/api/venues/${venueId}/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {
      // silently fail
    }
  }

  async function handleCreateOrder() {
    if (selectedTableNumber === null) return;
    try {
      const res = await fetch(`/api/venues/${venueId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: String(selectedTableNumber), guestCount: 1 }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setTableStatuses((prev) => {
        const next = new Map(prev);
        next.set(selectedTableNumber, "active");
        return next;
      });
      persistTableStatus(selectedTableNumber, "active");
      const orderRes = await fetch(`/api/venues/${venueId}/orders/${data.orderId}`);
      if (orderRes.ok) {
        const order = await orderRes.json();
        setOrders((prev) => {
          const next = new Map(prev);
          next.set(data.orderId, order);
          return next;
        });
      }
    } catch {
      // silently fail
    }
  }

  async function handleSendToKitchen() {
    if (!activeOrderId) return;
    try {
      await fetch(`/api/venues/${venueId}/orders/${activeOrderId}/send`, { method: "POST" });
      await refreshOrder();
    } catch {
      // silently fail
    }
  }

  async function handleCompleteOrder() {
    if (!activeOrderId) return;
    try {
      const res = await fetch(`/api/venues/${venueId}/orders/${activeOrderId}/complete`, { method: "POST" });
      if (!res.ok) return;
      const order = orders.get(activeOrderId);
      const tn = order?.tableNumber ? parseInt(order.tableNumber, 10) : null;
      if (tn && !isNaN(tn)) {
        setTableStatuses((prev) => {
          const next = new Map(prev);
          next.set(tn, "settled");
          return next;
        });
        persistTableStatus(tn, "settled");
      }
      setOrders((prev) => {
        const next = new Map(prev);
        next.delete(activeOrderId);
        return next;
      });
    } catch {
      // silently fail
    }
  }

  async function handleAddItem(menuItemId: string, variantId?: string, quantity: number = 1) {
    if (!activeOrderId) return;
    try {
      const res = await fetch(`/api/venues/${venueId}/orders/${activeOrderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId, variantId, quantity }),
      });
      if (!res.ok) return;
      setShowMenuBrowser(false);
      await refreshOrder();
    } catch {
      // silently fail
    }
  }

  async function refreshOrder() {
    if (!activeOrderId) return;
    try {
      const orderRes = await fetch(`/api/venues/${venueId}/orders/${activeOrderId}`);
      if (orderRes.ok) {
        const order = await orderRes.json();
        setOrders((prev) => {
          const next = new Map(prev);
          next.set(activeOrderId, order);
          return next;
        });
      }
    } catch {
      // silently fail
    }
  }

  async function handleItemStatus(itemId: string, status: string) {
    if (!activeOrderId) return;
    try {
      await fetch(`/api/venues/${venueId}/orders/${activeOrderId}/items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await refreshOrder();
    } catch {
      // silently fail
    }
  }

  async function handleCancelItem(itemId: string) {
    if (!activeOrderId) return;
    try {
      await fetch(`/api/venues/${venueId}/orders/${activeOrderId}/items/${itemId}`, {
        method: "DELETE",
      });
      await refreshOrder();
    } catch {
      // silently fail
    }
  }

  const activeOrder = activeOrderId ? orders.get(activeOrderId) : undefined;
  const selectedTableStatus = selectedTableNumber !== null ? tableStatuses.get(selectedTableNumber) : null;
  const isSettled = selectedTableStatus === "settled";

  function handleReleaseTable() {
    if (selectedTableNumber === null) return;
    setTableStatuses((prev) => {
      const next = new Map(prev);
      next.set(selectedTableNumber, "free");
      return next;
    });
    persistTableStatus(selectedTableNumber, "free");
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      <div className="w-[65%] overflow-y-auto">
        <TableGrid
          tables={tableInfoList}
          selectedTable={selectedTableNumber}
          onSelectTable={setSelectedTableNumber}
        />
      </div>
      <div className="w-[35%] overflow-y-auto">
        {selectedTableNumber === null ? (
          <div className="flex h-full items-center justify-center text-ink-muted">
            <p className="text-lg">یک میز را انتخاب کنید</p>
          </div>
        ) : !activeOrder ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p className="text-lg text-ink-muted">میز {selectedTableNumber}</p>
            {isSettled ? (
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={handleCreateOrder}
                  className="w-full rounded-[var(--radius-control)] bg-ink px-6 py-3 text-sm text-paper transition-opacity hover:opacity-90"
                >
                  افزودن آیتم
                </button>
                <button
                  onClick={handleReleaseTable}
                  className="w-full rounded-[var(--radius-control)] border border-line bg-paper px-6 py-3 text-sm text-ink transition-colors hover:bg-surface"
                >
                  آزاد سازی میز
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreateOrder}
                className="rounded-[var(--radius-control)] bg-ink px-6 py-3 text-sm text-paper transition-opacity hover:opacity-90"
              >
                شروع سفارش
              </button>
            )}
          </div>
        ) : (
          <OrderPanel
            order={activeOrder}
            onAddItem={() => setShowMenuBrowser(true)}
            onSendToKitchen={handleSendToKitchen}
            onCompleteOrder={handleCompleteOrder}
            onItemStatus={handleItemStatus}
            onCancelItem={handleCancelItem}
          />
        )}
      </div>

      {showMenuBrowser && (
        <MenuItemBrowser
          categories={categories}
          onSelect={handleAddItem}
          onClose={() => setShowMenuBrowser(false)}
        />
      )}
    </div>
  );
}

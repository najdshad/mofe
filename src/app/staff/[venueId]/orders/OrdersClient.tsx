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

type TableStatus = "free" | "active" | "ready";

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
        const res = await fetch(`/api/venues/${venueId}/orders?status=SENT`);
        if (!res.ok) return;
        const data: Order[] = await res.json();
        const orderMap = new Map<string, Order>();
        const statusMap = new Map<number, TableStatus>(tables.map((t) => [t.number, "free"]));

        for (const order of data) {
          orderMap.set(order.id, order);
          if (order.tableNumber) {
            const tn = parseInt(order.tableNumber, 10);
            if (!isNaN(tn)) {
              const allDelivered = order.items.length > 0 && order.items.every(
                (i) => i.status === "DELIVERED" || i.status === "CANCELLED"
              );
              statusMap.set(tn, allDelivered ? "ready" : "active");
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
        setTableStatuses((prev) => {
          const next = new Map(prev);
          next.set(Number(p.tableNumber), "active");
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
        setTableStatuses((prev) => {
          const next = new Map(prev);
          next.set(Number(p.tableNumber), "free");
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
    } catch {
      // silently fail
    }
  }

  async function handleCompleteOrder() {
    if (!activeOrderId) return;
    try {
      await fetch(`/api/venues/${venueId}/orders/${activeOrderId}/complete`, { method: "POST" });
    } catch {
      // silently fail
    }
  }

  async function handleAddItem(menuItemId: string, variantId?: string, quantity: number = 1) {
    if (!activeOrderId) return;
    try {
      await fetch(`/api/venues/${venueId}/orders/${activeOrderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId, variantId, quantity }),
      });
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
    } catch {
      // silently fail
    }
  }

  const activeOrder = activeOrderId ? orders.get(activeOrderId) : undefined;

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
            <button
              onClick={handleCreateOrder}
              className="rounded-[var(--radius-control)] bg-ink px-6 py-3 text-sm text-paper transition-opacity hover:opacity-90"
            >
              شروع سفارش
            </button>
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

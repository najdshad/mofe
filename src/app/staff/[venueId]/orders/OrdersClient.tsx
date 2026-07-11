"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TableGrid } from "@/components/orders/TableGrid";
import { OrderPanel } from "@/components/orders/OrderPanel";
import { MenuItemBrowser } from "@/components/orders/MenuItemBrowser";
import { useOrderWebSocket } from "@/lib/useOrderWebSocket";
import { fetchApi } from "@/lib/fetch-api";
import type { TableInfo, OrderData, CategoryData, TableData } from "@/components/orders/types";

type TableStatus = "free" | "active" | "ready" | "settled";

export function OrdersClient({
  venueId,
  tables,
  categories,
  editMode,
  onEditTable,
  onDeleteTable,
  onAddTable,
}: {
  venueId: string;
  tables: TableData[];
  categories: CategoryData[];
  editMode?: boolean;
  onEditTable?: (table: { id: string; number: number; label?: string }) => void;
  onDeleteTable?: (id: string) => void;
  onAddTable?: () => void;
}) {
  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(null);
  const [orders, setOrders] = useState<Map<string, OrderData>>(new Map());
  const [tableStatuses, setTableStatuses] = useState<Map<number, TableStatus>>(new Map());
  const [showMenuBrowser, setShowMenuBrowser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState({ send: false, complete: false });
  const fetchedRef = useRef(false);
  const tablesRef = useRef(tables);
  useEffect(() => { tablesRef.current = tables; }, [tables]);

  const clearError = useCallback(() => setError(null), []);

  async function persistTableStatus(tableNumber: number, status: TableStatus) {
    const table = tablesRef.current.find((t) => t.number === tableNumber);
    if (!table) return;
    try {
      await fetch(`/api/venues/${venueId}/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status.toUpperCase() }),
      });
    } catch {
      // background sync failure — non-critical
    }
  }

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchInitialOrders() {
      const statusMap = new Map<number, TableStatus>(
        tables.map((t) => [t.number, (t.status?.toLowerCase() as TableStatus) || "free"]),
      );
      let orderMap = new Map<string, OrderData>();

      try {
        const data: OrderData[] = await fetchApi(`/api/venues/${venueId}/orders`);
        orderMap = new Map<string, OrderData>();

        for (const order of data) {
          if (!order.tableNumber) continue;
          const tn = parseInt(order.tableNumber, 10);
          if (isNaN(tn)) continue;

          if (order.status === "COMPLETED") {
            if (statusMap.get(tn) !== "free" && statusMap.get(tn) !== "active") {
              statusMap.set(tn, "settled");
            }
          } else if (order.status !== "CANCELLED") {
            orderMap.set(order.id, order);
            statusMap.set(tn, "active");
          }
        }
      } catch {
        setError("خطا در بارگیری سفارش‌ها");
      }
      setOrders(orderMap);
      setTableStatuses(statusMap);
    }
    fetchInitialOrders();
  }, [venueId, tables]);

  const activeOrderId = useMemo(() => {
    if (selectedTableNumber === null) return null;
    for (const [orderId, order] of orders) {
      if (order.tableNumber === String(selectedTableNumber)) {
        return orderId;
      }
    }
    return null;
  }, [selectedTableNumber, orders]);

  useEffect(() => {
    if (!activeOrderId) return;
    let cancelled = false;
    fetchApi(`/api/venues/${venueId}/orders/${activeOrderId}`)
      .then((order: OrderData) => {
        if (cancelled) return;
        if (order.status === "COMPLETED" || order.status === "CANCELLED") return;
        setOrders((prev) => {
          const next = new Map(prev);
          next.set(activeOrderId, order);
          return next;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activeOrderId, venueId]);

  const onWSEvent = (event: { type: string; payload: unknown }) => {
    const p = event.payload as Record<string, unknown>;

    if (event.type === "order_created") {
      if (p.tableNumber) {
        const tn = Number(p.tableNumber);
        setTableStatuses((prev) => {
          const next = new Map(prev);
          next.set(tn, "active");
          return next;
        });
        persistTableStatus(tn, "active");
      }
    }

    if (event.type === "table_released") {
      if (p.tableNumber) {
        const tn = Number(p.tableNumber);
        setTableStatuses((prev) => {
          const next = new Map(prev);
          next.set(tn, "free");
          return next;
        });
        persistTableStatus(tn, "free");
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
        persistTableStatus(tn, "settled");
      }
    }

    if (["item_added", "item_updated", "item_cancelled", "item_status_changed"].includes(event.type)) {
      const orderId = p.orderId as string;
      if (orderId) {
        fetch(`/api/venues/${venueId}/orders/${orderId}`)
          .then((res) => res.json())
          .then((order: OrderData) => {
            if (order.status === "COMPLETED") return;
            if (order.status === "CANCELLED") {
              setOrders((prev) => {
                const next = new Map(prev);
                next.delete(orderId);
                return next;
              });
              if (order.tableNumber) {
                const tn = parseInt(order.tableNumber, 10);
                if (!isNaN(tn)) {
                  setTableStatuses((prev) => {
                    const next = new Map(prev);
                    next.set(tn, "settled");
                    return next;
                  });
                  persistTableStatus(tn, "settled");
                }
              }
              return;
            }
            setOrders((prev) => {
              const next = new Map(prev);
              next.set(orderId, order);
              return next;
            });
            if (order.tableNumber) {
              const tn = parseInt(order.tableNumber, 10);
              if (!isNaN(tn)) {
                const allCancelled = order.items.every((i) => i.status === "CANCELLED");
                const allDelivered = order.items.length > 0 && order.items.every(
                  (i) => i.status === "DELIVERED" || i.status === "CANCELLED"
                );
                setTableStatuses((prev) => {
                  const next = new Map(prev);
                  if (allCancelled) {
                    next.set(tn, "settled");
                  } else if (allDelivered) {
                    next.set(tn, "ready");
                  } else {
                    next.set(tn, "active");
                  }
                  return next;
                });
              }
            }
          })
          .catch(() => {});
      }
    }
  };

  useOrderWebSocket(venueId, onWSEvent);

  const tableInfoList: TableInfo[] = tables.map((t) => ({
    tableNumber: t.number,
    tableId: t.id,
    status: tableStatuses.get(t.number) || "free",
    label: t.label,
  }));

  async function handleCreateOrder() {
    if (selectedTableNumber === null) return;
    try {
      setError(null);
      const data = await fetchApi(`/api/venues/${venueId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: String(selectedTableNumber), guestCount: 1 }),
      });
      setTableStatuses((prev) => {
        const next = new Map(prev);
        next.set(selectedTableNumber, "active");
        return next;
      });
      persistTableStatus(selectedTableNumber, "active");
      const order = await fetchApi(`/api/venues/${venueId}/orders/${data.orderId}`);
      setOrders((prev) => {
        const next = new Map(prev);
        next.set(data.orderId, order);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ایجاد سفارش");
    }
  }

  async function handleSendToKitchen() {
    if (!activeOrderId) return;
    setLoading((prev) => ({ ...prev, send: true }));
    setError(null);
    try {
      await fetchApi(`/api/venues/${venueId}/orders/${activeOrderId}/send`, { method: "POST" });
      await refreshOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ارسال به آشپزخانه");
    } finally {
      setLoading((prev) => ({ ...prev, send: false }));
    }
  }

  async function handleCompleteOrder() {
    if (!activeOrderId) return;
    setLoading((prev) => ({ ...prev, complete: true }));
    setError(null);
    try {
      await fetchApi(`/api/venues/${venueId}/orders/${activeOrderId}/complete`, { method: "POST" });
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تسویه حساب");
    } finally {
      setLoading((prev) => ({ ...prev, complete: false }));
    }
  }

  async function handleAddItem(menuItemId: string, variantId?: string, quantity: number = 1) {
    if (!activeOrderId) return;
    setError(null);
    try {
      await fetchApi(`/api/venues/${venueId}/orders/${activeOrderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuItemId, variantId, quantity }),
      });
      setShowMenuBrowser(false);
      await refreshOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در افزودن آیتم");
    }
  }

  async function refreshOrder() {
    if (!activeOrderId) return;
    try {
      const order = await fetchApi(`/api/venues/${venueId}/orders/${activeOrderId}`);
      if (order.status === "COMPLETED" || order.status === "CANCELLED") {
        setOrders((prev) => {
          const next = new Map(prev);
          next.delete(activeOrderId);
          return next;
        });
        if (order.tableNumber) {
          const tn = parseInt(order.tableNumber, 10);
          if (!isNaN(tn)) {
            setTableStatuses((prev) => {
              const next = new Map(prev);
              next.set(tn, "settled");
              return next;
            });
            persistTableStatus(tn, "settled");
          }
        }
        return;
      }
      setOrders((prev) => {
        const next = new Map(prev);
        next.set(activeOrderId, order);
        return next;
      });
    } catch {
      // silently fail on refresh
    }
  }

  async function handleItemStatus(itemId: string, status: string) {
    if (!activeOrderId) return;
    setError(null);
    try {
      await fetchApi(`/api/venues/${venueId}/orders/${activeOrderId}/items/${itemId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await refreshOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تغییر وضعیت");
    }
  }

  async function handleCancelItem(itemId: string) {
    if (!activeOrderId) return;
    setError(null);
    try {
      await fetchApi(`/api/venues/${venueId}/orders/${activeOrderId}/items/${itemId}`, {
        method: "DELETE",
      });
      await refreshOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در لغو آیتم");
    }
  }

  const activeOrder = activeOrderId ? orders.get(activeOrderId) : undefined;
  const selectedTableStatus = selectedTableNumber !== null ? tableStatuses.get(selectedTableNumber) : null;
  const isSettled = selectedTableStatus === "settled";

  async function handleReleaseTable() {
    if (selectedTableNumber === null) return;
    setTableStatuses((prev) => {
      const next = new Map(prev);
      next.set(selectedTableNumber, "free");
      return next;
    });
    persistTableStatus(selectedTableNumber, "free");
    try {
      await fetch(`/api/venues/${venueId}/orders/release-table/${selectedTableNumber}`, { method: "POST" });
    } catch {}
    setOrders((prev) => {
      const next = new Map(prev);
      for (const [id, order] of next) {
        if (order.tableNumber === String(selectedTableNumber)) {
          next.delete(id);
        }
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:h-[calc(100vh-8rem)]">
      {/* Table grid */}
      <div className="w-full lg:w-[65%] overflow-y-auto">
        <TableGrid
          tables={tableInfoList}
          selectedTable={selectedTableNumber}
          onSelectTable={setSelectedTableNumber}
          editMode={editMode}
          onEdit={onEditTable}
          onDelete={onDeleteTable}
          onAddTable={onAddTable}
        />
      </div>

      {/* Order panel / placeholder */}
      <div className="w-full lg:w-[35%] overflow-y-auto transition-all duration-300">
        {error && !activeOrder && (
          <div className="mb-3 rounded-[var(--radius-control)] bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {error}
            <button onClick={clearError} className="mr-2 text-red-500 hover:text-red-700 font-medium">✕</button>
          </div>
        )}
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
            loading={{ send: loading.send, complete: loading.complete }}
            error={error}
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

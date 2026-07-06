"use client";

import { useState } from "react";
import { OrdersClient } from "@/app/staff/[venueId]/orders/OrdersClient";

interface TableData {
  id: string;
  number: number;
  label?: string;
  isActive: boolean;
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

export function AdminOrdersClient({
  venueId,
  tables: initialTables,
  categories,
}: {
  venueId: string;
  tables: TableData[];
  categories: CategoryData[];
}) {
  const [tables, setTables] = useState(initialTables.filter((t) => t.isActive));
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState("");
  const [editLabel, setEditLabel] = useState("");

  async function handleAddTable() {
    const num = parseInt(editNumber, 10);
    if (isNaN(num) || num < 1) return;
    try {
      const res = await fetch(`/api/venues/${venueId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, label: editLabel || undefined }),
      });
      if (!res.ok) return;
      const table = await res.json();
      setTables((prev) => [...prev, { id: table.id, number: table.number, label: table.label || undefined, isActive: true }].sort((a, b) => a.number - b.number));
      setShowAddModal(false);
      setEditNumber("");
      setEditLabel("");
    } catch {
      // silently fail
    }
  }

  async function handleRemoveTable(tableId: string) {
    try {
      const res = await fetch(`/api/venues/${venueId}/tables/${tableId}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    } catch {
      // silently fail
    }
  }

  async function handleUpdateTable(tableId: string) {
    const num = parseInt(editNumber, 10);
    if (isNaN(num) || num < 1) return;
    try {
      const res = await fetch(`/api/venues/${venueId}/tables/${tableId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: num, label: editLabel || null }),
      });
      if (!res.ok) return;
      const table = await res.json();
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, number: table.number, label: table.label || undefined } : t))
      );
      setEditTableId(null);
      setEditNumber("");
      setEditLabel("");
    } catch {
      // silently fail
    }
  }

  function openEdit(table: TableData) {
    setEditTableId(table.id);
    setEditNumber(String(table.number));
    setEditLabel(table.label || "");
  }

  return (
    <div>
      {/* Table management bar */}
      {editMode && (
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => {
              setEditNumber("");
              setEditLabel("");
              setShowAddModal(true);
            }}
            className="rounded-[var(--radius-control)] bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
          >
            افزودن میز
          </button>
          {editTableId && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                className="w-20 rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
              />
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="برچسب"
                className="w-28 rounded-[var(--radius-control)] border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ink"
              />
              <button
                onClick={() => handleUpdateTable(editTableId)}
                className="rounded-[var(--radius-control)] bg-green-600 px-3 py-1.5 text-sm text-white"
              >
                ذخیره
              </button>
              <button
                onClick={() => {
                  setEditTableId(null);
                  setEditNumber("");
                  setEditLabel("");
                }}
                className="text-sm text-ink-muted hover:text-ink"
              >
                انصراف
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table grid with edit controls */}
      <div className="grid grid-cols-4 gap-4 md:grid-cols-5">
        {tables.map((t) => (
          <div key={t.id} className="relative">
            <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-line bg-paper p-6">
              <span className="text-3xl font-serif text-ink-strong">{t.number}</span>
              {t.label && <span className="text-xs text-ink-muted">{t.label}</span>}
            </div>
            {editMode && (
              <div className="absolute left-1 top-1 flex gap-1">
                <button
                  onClick={() => openEdit(t)}
                  className="rounded bg-blue-500 px-2 py-0.5 text-xs text-white hover:bg-blue-600"
                >
                  ویرایش
                </button>
                <button
                  onClick={() => handleRemoveTable(t.id)}
                  className="rounded bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600"
                >
                  حذف
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit mode toggle */}
      <div className="mt-4 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={editMode}
            onChange={(e) => setEditMode(e.target.checked)}
            className="h-4 w-4 rounded border-line text-ink focus:ring-ink"
          />
          ویرایش میزها
        </label>
      </div>

      {/* Add table modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-[var(--radius-panel)] border border-line bg-paper p-4">
            <h3 className="text-base font-serif text-ink-strong">افزودن میز جدید</h3>
            <div className="mt-3 flex flex-col gap-3">
              <input
                type="number"
                min="1"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                placeholder="شماره میز"
                className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="برچسب (اختیاری)"
                className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddTable}
                  className="flex-1 rounded-[var(--radius-control)] bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
                >
                  افزودن
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-[var(--radius-control)] border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-surface"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff ordering UI below */}
      <div className="mt-6">
        <OrdersClient
          venueId={venueId}
          tables={tables.map((t) => ({ id: t.id, number: t.number, label: t.label }))}
          categories={categories}
        />
      </div>
    </div>
  );
}

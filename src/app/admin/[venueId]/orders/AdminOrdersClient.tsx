"use client";

import { useState, useMemo, useCallback } from "react";
import { OrdersClient } from "@/app/staff/[venueId]/orders/OrdersClient";
import { Toggle } from "@/components/ui/Toggle";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { TagInput } from "@/components/orders/TagInput";
import type { TableData, CategoryData } from "@/components/orders/types";

const CSRF_COOKIE = "mofe_csrf";
const CSRF_HEADER = "X-CSRF-Token";

function csrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(new RegExp(`(^| )${CSRF_COOKIE}=([^;]+)`));
  return match ? { [CSRF_HEADER]: match[2] } : {};
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
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [modalNumber, setModalNumber] = useState("");
  const [modalLabel, setModalLabel] = useState("");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [modalTags, setModalTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const t of tables) {
      for (const tag of t.tags || []) tagSet.add(tag);
    }
    return [...tagSet].sort();
  }, [tables]);

  const openAddModal = useCallback(() => {
    setModalMode("add");
    setModalNumber("");
    setModalLabel("");
    setModalTags([]);
    setEditingTableId(null);
  }, []);

  const openEditModal = useCallback((table: { id: string; number: number; label?: string; tags?: string[] }) => {
    setModalMode("edit");
    setModalNumber(String(table.number));
    setModalLabel(table.label || "");
    setModalTags(table.tags || []);
    setEditingTableId(table.id);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setModalNumber("");
    setModalLabel("");
    setModalTags([]);
    setEditingTableId(null);
  }, []);

  async function handleSaveTable() {
    const num = parseInt(modalNumber, 10);
    if (isNaN(num) || num < 1) return;

    setSaving(true);
    try {
      if (modalMode === "add") {
        const res = await fetch(`/api/venues/${venueId}/tables`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ number: num, label: modalLabel || undefined, tags: modalTags }),
        });
        if (!res.ok) return;
        const table = await res.json();
        setTables((prev) =>
          [
            ...prev,
            {
              id: table.id,
              number: table.number,
              label: table.label || undefined,
              tags: table.tags,
              isActive: true,
              status: table.status,
            },
          ].sort((a, b) => a.number - b.number),
        );
      } else if (modalMode === "edit" && editingTableId) {
        const res = await fetch(`/api/venues/${venueId}/tables/${editingTableId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ number: num, label: modalLabel || null, tags: modalTags }),
        });
        if (!res.ok) return;
        const table = await res.json();
        setTables((prev) =>
          prev.map((t) =>
            t.id === editingTableId
              ? { ...t, number: table.number, label: table.label || undefined, tags: table.tags }
              : t,
          ),
        );
      }
      closeModal();
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTable(tableId: string) {
    try {
      const res = await fetch(`/api/venues/${venueId}/tables/${tableId}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      if (!res.ok) return;
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    } catch {
      // silently fail
    }
  }

  const modalTitle = modalMode === "add" ? "افزودن میز جدید" : "ویرایش میز";
  const confirmLabel = modalMode === "add" ? "افزودن" : "ذخیره";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <label className="flex items-center gap-3 text-sm text-ink-muted cursor-pointer">
          <Toggle on={editMode} onChange={setEditMode} />
          ویرایش میزها
        </label>
      </div>

      <OrdersClient
        venueId={venueId}
        tables={tables.map((t) => ({ id: t.id, number: t.number, label: t.label, tags: t.tags, status: t.status }))}
        categories={categories}
        editMode={editMode}
        onEditTable={openEditModal}
        onDeleteTable={handleDeleteTable}
        onAddTable={openAddModal}
      />

      <Modal
        open={modalMode !== null}
        onClose={closeModal}
        onConfirm={handleSaveTable}
        title={modalTitle}
        confirmLabel={confirmLabel}
        loading={saving}
      >
        <div className="flex flex-col gap-3">
          <Input
            label="شماره میز"
            type="number"
            min="1"
            value={modalNumber}
            onChange={(e) => setModalNumber(e.target.value)}
            placeholder="مثلاً ۱"
            autoFocus
          />
          <Input
            label="برچسب (اختیاری)"
            type="text"
            value={modalLabel}
            onChange={(e) => setModalLabel(e.target.value)}
            placeholder="مثلاً کنار پنجره"
          />
          <TagInput
            tags={modalTags}
            onChange={setModalTags}
            existingTags={allTags}
            placeholder="برچسب (تراس، داخلی، VIP)"
          />
        </div>
      </Modal>
    </div>
  );
}

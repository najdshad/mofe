"use client";

import { useState, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Panel } from "@/components/ui/Panel";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface Category {
  id: string;
  nameFa: string;
  displayOrder: number;
  active: boolean;
  itemCount: number;
}

interface Item {
  id: string;
  nameFa: string;
  nameEn: string | null;
  categoryId: string;
  categoryNameFa: string;
  priceToman: number;
  priceFormatted: string;
  station: string;
  visibleOnPublicMenu: boolean;
  isSoldOut: boolean;
  description: string | null;
  calories: number | null;
  displayOrder: number;
}

interface MenuClientProps {
  venueId: string;
  categories: Category[];
  items: Item[];
}

const stations = [
  { value: "kitchen", label: "آشپزخانه" },
  { value: "bar", label: "بار" },
];

function SortableCategoryRow({
  cat,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  cat: Category;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-2xl border px-3 py-3 transition-colors ${
        selected ? "border-ink bg-ink/5" : "border-line hover:border-ink"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1 text-ink-muted hover:text-ink transition-colors"
        title="جابجایی"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </button>
      <button onClick={onSelect} className="min-w-0 flex-1 text-right">
        <span className="block truncate text-sm text-ink">{cat.nameFa}</span>
        <span className="mt-0.5 block text-[11px] text-ink-muted">
          {cat.itemCount} آیتم
        </span>
      </button>
      <div className="shrink-0 flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-1 text-ink-muted hover:text-ink transition-colors"
          title="ویرایش"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-ink-muted hover:text-red-600 transition-colors"
          title="حذف"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle on={cat.active} onChange={(active) => onToggleActive(active)} />
        </div>
      </div>
    </div>
  );
}

const COL_TEMPLATE = "36px 2fr 1fr 0.8fr 0.8fr 1fr 0.5fr";

function SortableItemRow({
  item,
  index,
  total,
  selectionMode,
  checked,
  onToggleCheck,
  onToggleVisibility,
  onToggleSoldOut,
  onEdit,
  onDelete,
}: {
  item: Item;
  index: number;
  total: number;
  selectionMode: boolean;
  checked: boolean;
  onToggleCheck: () => void;
  onToggleVisibility: (v: boolean) => void;
  onToggleSoldOut: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-[${COL_TEMPLATE}] items-center gap-3 px-4 py-4 ${
        index !== total - 1 ? "border-b border-line/50" : ""
      }`}
    >
      <div className="flex items-center gap-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-0.5 text-ink-muted/40 hover:text-ink-muted transition-colors"
          title="جابجایی"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>
        </button>
        {selectionMode && (
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleCheck}
            className="rounded border-line text-ink focus:ring-ink cursor-pointer"
          />
        )}
      </div>
      <div>
        <div className="font-serif text-lg text-ink">{item.nameFa}</div>
        {item.nameEn && (
          <div className="mt-0.5 text-sm text-ink-muted">{item.nameEn}</div>
        )}
        {item.description && (
          <div className="mt-1 max-w-xs truncate text-xs leading-relaxed text-ink-muted">
            {item.description}
          </div>
        )}
        {item.calories && <Badge muted>{item.calories} kcal</Badge>}
      </div>
      <div className="text-sm text-ink">
        {item.priceFormatted}
        <span className="mr-1 text-xs text-ink-muted">تومان</span>
      </div>
      <div>
        <Badge muted>
          {item.station === "bar" ? "بار" : "آشپزخانه"}
        </Badge>
      </div>
      <div>
        <Toggle
          on={item.visibleOnPublicMenu}
          onChange={(v) => onToggleVisibility(v)}
        />
      </div>
      <div>
        {item.isSoldOut ? (
          <Badge variant="soldOut">ناموجود</Badge>
        ) : (
          <button
            onClick={() => onToggleSoldOut(true)}
            className="text-xs text-ink-muted hover:text-ink transition-colors"
          >
            موجود
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-1 text-ink-muted hover:text-ink transition-colors"
          title="ویرایش"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-ink-muted hover:text-red-600 transition-colors"
          title="حذف"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
}

function CategoryModal({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (nameFa: string) => Promise<void>;
  initial?: { nameFa: string; id: string };
}) {
  const [nameFa, setNameFa] = useState(initial?.nameFa ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!nameFa.trim()) return;
    setLoading(true);
    setError("");
    try {
      await onSave(nameFa.trim());
      onClose();
    } catch (e) {
      console.error("Category save error:", e);
      setError(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      onConfirm={handleSave}
      title={initial ? "ویرایش دسته" : "افزودن دسته"}
      confirmLabel={initial ? "ذخیره" : "افزودن"}
      loading={loading}
    >
      <Input
        label="نام دسته"
        value={nameFa}
        onChange={(e) => setNameFa(e.target.value)}
        placeholder="مثلاً: نوشیدنی گرم"
        autoFocus
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

function ItemModal({
  open,
  onClose,
  onSave,
  categories,
  initial,
  targetCategoryId,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    nameFa: string;
    nameEn?: string;
    categoryId: string;
    priceToman: number;
    station: string;
    description?: string;
    calories?: number;
    visibleOnPublicMenu: boolean;
    isSoldOut: boolean;
  }) => Promise<void>;
  categories: { id: string; nameFa: string }[];
  initial?: Item;
  targetCategoryId?: string;
}) {
  const [nameFa, setNameFa] = useState(initial?.nameFa ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? targetCategoryId ?? categories[0]?.id ?? ""
  );
  const [priceToman, setPriceToman] = useState(String(initial?.priceToman ?? ""));
  const [station, setStation] = useState(initial?.station ?? "kitchen");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [calories, setCalories] = useState(String(initial?.calories ?? ""));
  const [visibleOnPublicMenu, setVisibleOnPublicMenu] = useState(
    initial?.visibleOnPublicMenu ?? true
  );
  const [isSoldOut, setIsSoldOut] = useState(initial?.isSoldOut ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!nameFa.trim()) {
      setError("نام فارسی الزامی است");
      return;
    }
    if (!priceToman || isNaN(Number(priceToman))) {
      setError("قیمت معتبر وارد کنید");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSave({
        nameFa: nameFa.trim(),
        nameEn: nameEn.trim() || undefined,
        categoryId,
        priceToman: Number(priceToman),
        station,
        description: description.trim() || undefined,
        calories: calories ? Number(calories) : undefined,
        visibleOnPublicMenu,
        isSoldOut,
      });
      onClose();
    } catch (e) {
      console.error("Item save error:", e);
      setError(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      onConfirm={handleSave}
      title={initial ? "ویرایش آیتم" : "افزودن آیتم"}
      confirmLabel={initial ? "ذخیره" : "افزودن"}
      loading={loading}
    >
      <div className="space-y-4">
        <Input
          label="نام فارسی"
          value={nameFa}
          onChange={(e) => setNameFa(e.target.value)}
          placeholder="مثلاً: اسپرسو"
          autoFocus
        />
        <Input
          label="نام انگلیسی (اختیاری)"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder="Espresso"
        />
        <div className="space-y-1.5">
          <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
            دسته
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nameFa}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              label="قیمت (تومان)"
              type="number"
              value={priceToman}
              onChange={(e) => setPriceToman(e.target.value)}
              placeholder="۰"
            />
          </div>
          <div className="flex-1">
            <Input
              label="کالری (اختیاری)"
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="—"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
            ایستگاه
          </label>
          <select
            value={station}
            onChange={(e) => setStation(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink"
          >
            <option value="kitchen">آشپزخانه</option>
            <option value="bar">بار</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
            توضیحات (اختیاری)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="توضیحات کوتاه..."
            rows={3}
            className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none resize-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visibleOnPublicMenu}
              onChange={(e) => setVisibleOnPublicMenu(e.target.checked)}
              className="rounded border-line text-ink focus:ring-ink"
            />
            <span className="text-sm text-ink">نمایش در منوی عمومی</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSoldOut}
              onChange={(e) => setIsSoldOut(e.target.checked)}
              className="rounded border-line text-ink focus:ring-ink"
            />
            <span className="text-sm text-ink">ناموجود</span>
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  );
}

function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در حذف");
      console.error("Delete error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      onConfirm={handleDelete}
      title={title}
      confirmLabel="حذف"
      confirmVariant="destructive"
      loading={loading}
    >
      {children}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

export function MenuClient({ venueId, categories: initialCategories, items: initialItems }: MenuClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [stationFilter, setStationFilter] = useState<string>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [newItemCategoryId, setNewItemCategoryId] = useState<string | undefined>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    summary: { total: number; created: number; skipped: number; errors: number };
    details: { row: number; status: string; nameFa: string; message?: string }[];
  } | null>(null);

  const filteredItems = items
    .filter((item) => {
      if (stationFilter !== "all" && item.station !== stationFilter) return false;
      if (selectedCategoryId && item.categoryId !== selectedCategoryId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !item.nameFa.toLowerCase().includes(q) &&
          !(item.nameEn?.toLowerCase() || "").includes(q)
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
    setSelectionMode(false);
  };

  const handleBulkVisibility = async (visible: boolean) => {
    if (selectedItems.size === 0) return;
    const itemIds = Array.from(selectedItems);
    setItems((prev) =>
      prev.map((i) =>
        itemIds.includes(i.id) ? { ...i, visibleOnPublicMenu: visible } : i
      )
    );
    setSelectedItems(new Set());
    await fetch(`/api/venues/${venueId}/items/bulk-visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible, itemIds }),
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const oldIndex = sorted.findIndex((c) => c.id === active.id);
    const newIndex = sorted.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    const updates = reordered.map((cat, idx) => ({ id: cat.id, displayOrder: idx }));
    setCategories((prev) =>
      prev.map((cat) => {
        const u = updates.find((x) => x.id === cat.id);
        return u ? { ...cat, displayOrder: u.displayOrder } : cat;
      })
    );
    fetch(`/api/venues/${venueId}/categories/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders: updates }),
    });
  };

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const dragged = items.find((i) => i.id === active.id);
    if (!dragged) return;
    const sameCategory = items
      .filter((i) => i.categoryId === dragged.categoryId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const oldIndex = sameCategory.findIndex((i) => i.id === active.id);
    const newIndex = sameCategory.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sameCategory, oldIndex, newIndex);
    const updates = reordered.map((item, idx) => ({ id: item.id, displayOrder: idx }));
    setItems((prev) =>
      prev.map((item) => {
        const u = updates.find((x) => x.id === item.id);
        return u ? { ...item, displayOrder: u.displayOrder } : item;
      })
    );
    fetch(`/api/venues/${venueId}/items/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orders: updates }),
    });
  };

  const handleCreateCategory = async (nameFa: string) => {
    const res = await fetch(`/api/venues/${venueId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameFa }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "خطا در ایجاد دسته");
    }
    const created = await res.json();
    setCategories((prev) => [
      ...prev,
      { ...created, itemCount: 0 },
    ]);
  };

  const handleUpdateCategory = async (nameFa: string) => {
    if (!editingCategory) return;
    const res = await fetch(
      `/api/venues/${venueId}/categories/${editingCategory.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameFa }),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "خطا در ویرایش دسته");
    }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingCategory.id ? { ...c, nameFa } : c
      )
    );
    setEditingCategory(null);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    const res = await fetch(
      `/api/venues/${venueId}/categories/${deletingCategory.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "خطا در حذف دسته");
    }
    setCategories((prev) =>
      prev.filter((c) => c.id !== deletingCategory.id)
    );
    if (selectedCategoryId === deletingCategory.id) {
      setSelectedCategoryId(categories[0]?.id ?? null);
    }
    setDeletingCategory(null);
  };

  const handleToggleCategoryActive = async (categoryId: string, active: boolean) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, active } : c
      )
    );
    await fetch(`/api/venues/${venueId}/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  };

  const handleCreateItem = async (data: {
    nameFa: string;
    nameEn?: string;
    categoryId: string;
    priceToman: number;
    station: string;
    description?: string;
    calories?: number;
    visibleOnPublicMenu: boolean;
    isSoldOut: boolean;
  }) => {
    const res = await fetch(`/api/venues/${venueId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "خطا در ایجاد آیتم");
    }
    const created = await res.json();
    const category = categories.find((c) => c.id === created.categoryId);
    setItems((prev) => [
      ...prev,
      {
        id: created.id,
        nameFa: created.nameFa,
        nameEn: created.nameEn,
        categoryId: created.categoryId,
        categoryNameFa: category?.nameFa ?? "",
        priceToman: created.priceToman,
        priceFormatted: created.priceToman.toLocaleString("fa-IR"),
        station: created.station,
        visibleOnPublicMenu: created.visibleOnPublicMenu,
        isSoldOut: created.isSoldOut,
        description: created.description,
        calories: created.calories,
        displayOrder: created.displayOrder,
      },
    ]);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === created.categoryId
          ? { ...c, itemCount: c.itemCount + 1 }
          : c
      )
    );
  };

  const handleUpdateItem = async (data: {
    nameFa: string;
    nameEn?: string;
    categoryId: string;
    priceToman: number;
    station: string;
    description?: string;
    calories?: number;
    visibleOnPublicMenu: boolean;
    isSoldOut: boolean;
  }) => {
    if (!editingItem) return;
    const res = await fetch(
      `/api/venues/${venueId}/items/${editingItem.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "خطا در ویرایش آیتم");
    }
    const category = categories.find((c) => c.id === data.categoryId);

    if (data.categoryId !== editingItem.categoryId) {
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id === editingItem.categoryId) return { ...c, itemCount: Math.max(0, c.itemCount - 1) };
          if (c.id === data.categoryId) return { ...c, itemCount: c.itemCount + 1 };
          return c;
        })
      );
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              nameFa: data.nameFa,
              nameEn: data.nameEn ?? null,
              categoryId: data.categoryId,
              categoryNameFa: category?.nameFa ?? "",
              priceToman: data.priceToman,
              station: data.station,
              description: data.description ?? null,
              calories: data.calories ?? null,
              visibleOnPublicMenu: data.visibleOnPublicMenu,
              isSoldOut: data.isSoldOut,
            }
          : i
      )
    );
    setEditingItem(null);
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    const res = await fetch(
      `/api/venues/${venueId}/items/${deletingItem.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "خطا در حذف آیتم");
    }
    setItems((prev) => prev.filter((i) => i.id !== deletingItem.id));
    setCategories((prev) =>
      prev.map((c) =>
        c.id === deletingItem.categoryId
          ? { ...c, itemCount: Math.max(0, c.itemCount - 1) }
          : c
      )
    );
    setDeletingItem(null);
  };

  const handleToggleVisibility = async (itemId: string, visible: boolean) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, visibleOnPublicMenu: visible } : i
      )
    );
    await fetch(`/api/venues/${venueId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleOnPublicMenu: visible }),
    });
  };

  const handleToggleSoldOut = async (itemId: string, soldOut: boolean) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, isSoldOut: soldOut } : i
      )
    );
    await fetch(`/api/venues/${venueId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSoldOut: soldOut }),
    });
  };

  const handleExportCSV = () => {
    const headers = ["nameFa", "nameEn", "categoryNameFa", "priceToman", "station", "description", "calories", "visibleOnPublicMenu", "isSoldOut"];
    const rows = items.map((item) => [
      item.nameFa,
      item.nameEn ?? "",
      item.categoryNameFa,
      String(item.priceToman),
      item.station,
      item.description ?? "",
      item.calories != null ? String(item.calories) : "",
      item.visibleOnPublicMenu ? "true" : "false",
      item.isSoldOut ? "true" : "false",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(",")
      ),
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `menu-items-${venueId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const res = await fetch(`/api/venues/${venueId}/items/import-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      setImportResults(data);
      if (data.summary?.created > 0) {
        window.location.reload();
      }
    } catch {
      setImportResults({
        summary: { total: 0, created: 0, skipped: 0, errors: 1 },
        details: [{ row: 0, status: "error", nameFa: "", message: "خطا در خواندن فایل" }],
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNewItem = (categoryId?: string) => {
    setEditingItem(null);
    setNewItemCategoryId(categoryId);
    setItemModalOpen(true);
  };

  const categoryDndIds = categories.map((c) => c.id);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <Panel title="دسته‌ها" subtitle="مدیریت دسته‌بندی آیتم‌ها">
          <div className="space-y-2">
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm text-ink-muted hover:border-ink hover:text-ink transition-colors"
            >
              + افزودن دسته
            </button>

            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`w-full rounded-2xl border px-4 py-3 text-right text-sm transition-colors ${
                selectedCategoryId === null
                  ? "border-ink bg-ink/5"
                  : "border-line hover:border-ink"
              }`}
            >
              <span className="text-ink">همه آیتم‌ها</span>
              <span className="mr-2 text-xs text-ink-muted">
                ({items.length})
              </span>
            </button>
            {categoryDndIds.length > 0 && (
              <DndContext
                onDragEnd={handleCategoryDragEnd}
                collisionDetection={closestCenter}
                sensors={sensors}
              >
                <SortableContext
                  items={categoryDndIds}
                  strategy={verticalListSortingStrategy}
                >
                  {[...categories]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((cat) => (
                      <SortableCategoryRow
                        key={cat.id}
                        cat={cat}
                        selected={selectedCategoryId === cat.id}
                        onSelect={() => setSelectedCategoryId(cat.id)}
                        onEdit={() => {
                          setEditingCategory(cat);
                          setCategoryModalOpen(true);
                        }}
                        onDelete={() => setDeletingCategory(cat)}
                        onToggleActive={(active) =>
                          handleToggleCategoryActive(cat.id, active)
                        }
                      />
                    ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="آیتم‌ها">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="sm:flex-1">
                <Input
                  label="جستجو"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="نام فارسی یا انگلیسی..."
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  className="w-full sm:w-auto rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink"
                >
                  <option value="all">همه ایستگاه‌ها</option>
                  <option value="kitchen">آشپزخانه</option>
                  <option value="bar">بار</option>
                </select>
                <Button
                  onClick={() => handleNewItem(selectedCategoryId ?? undefined)}
                  size="sm"
                >
                  + افزودن آیتم
                </Button>
                <button
                  onClick={() => {
                    if (selectionMode) {
                      setSelectionMode(false);
                      setSelectedItems(new Set());
                    } else {
                      setSelectionMode(true);
                    }
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selectionMode
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {selectionMode ? "پایان انتخاب" : "انتخاب چندتایی"}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted hover:border-ink hover:text-ink transition-colors"
                >
                  خروجی CSV
                </button>
                <label
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted hover:border-ink hover:text-ink transition-colors cursor-pointer"
                >
                  {importing ? "..." : "ورودی CSV"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleImportCSV}
                    disabled={importing}
                  />
                </label>
              </div>
            </div>

            {selectionMode && selectedItems.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-ink/20 bg-ink/5 px-4 py-3">
                <span className="text-sm text-ink">
                  {selectedItems.size} آیتم انتخاب شده
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkVisibility(true)}
                >
                  نمایش در منوی عمومی
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkVisibility(false)}
                >
                  مخفی از منوی عمومی
                </Button>
                <button
                  onClick={handleClearSelection}
                  className="mr-auto text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  لغو انتخاب
                </button>
              </div>
            )}

            <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">

              {selectedCategoryId ? (
                <DndContext
                  onDragEnd={handleItemDragEnd}
                  collisionDetection={closestCenter}
                  sensors={sensors}
                >
                  <SortableContext
                    items={filteredItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredItems.map((item, idx) => (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        index={idx}
                        total={filteredItems.length}
                        selectionMode={selectionMode}
                        checked={selectedItems.has(item.id)}
                        onToggleCheck={() => toggleItemSelection(item.id)}
                        onToggleVisibility={(v) =>
                          handleToggleVisibility(item.id, v)
                        }
                        onToggleSoldOut={(v) =>
                          handleToggleSoldOut(item.id, v)
                        }
                        onEdit={() => {
                          setEditingItem(item);
                          setItemModalOpen(true);
                        }}
                        onDelete={() => setDeletingItem(item)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                filteredItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[${COL_TEMPLATE}] items-center gap-3 px-4 py-4 ${
                      idx !== filteredItems.length - 1
                        ? "border-b border-line/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="rounded border-line text-ink focus:ring-ink cursor-pointer"
                        />
                      )}
                    </div>
                    <div>
                      <div className="font-serif text-lg text-ink">
                        {item.nameFa}
                      </div>
                      {item.nameEn && (
                        <div className="mt-0.5 text-sm text-ink-muted">
                          {item.nameEn}
                        </div>
                      )}
                      {item.description && (
                        <div className="mt-1 max-w-xs truncate text-xs leading-relaxed text-ink-muted">
                          {item.description}
                        </div>
                      )}
                      {item.calories && <Badge muted>{item.calories} kcal</Badge>}
                    </div>
                    <div className="text-sm text-ink">
                      {item.priceFormatted}
                      <span className="mr-1 text-xs text-ink-muted">تومان</span>
                    </div>
                    <div>
                      <Badge muted>
                        {item.station === "bar" ? "بار" : "آشپزخانه"}
                      </Badge>
                    </div>
                    <div>
                      <Toggle
                        on={item.visibleOnPublicMenu}
                        onChange={(v) => handleToggleVisibility(item.id, v)}
                      />
                    </div>
                    <div>
                      {item.isSoldOut ? (
                        <Badge variant="soldOut">ناموجود</Badge>
                      ) : (
                        <button
                          onClick={() => handleToggleSoldOut(item.id, true)}
                          className="text-xs text-ink-muted hover:text-ink transition-colors"
                        >
                          موجود
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setItemModalOpen(true);
                        }}
                        className="p-1 text-ink-muted hover:text-ink transition-colors"
                        title="ویرایش"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="p-1 text-ink-muted hover:text-red-600 transition-colors"
                        title="حذف"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
              {filteredItems.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-ink-muted">
                  هیچ آیتمی یافت نشد
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <CategoryModal
        open={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={editingCategory ? handleUpdateCategory : handleCreateCategory}
        initial={editingCategory ? { nameFa: editingCategory.nameFa, id: editingCategory.id } : undefined}
      />

      <DeleteConfirmModal
        open={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        title={`حذف دسته "${deletingCategory?.nameFa ?? ""}"`}
      >
        <p>آیا از حذف این دسته اطمینان دارید؟</p>
        {deletingCategory && deletingCategory.itemCount > 0 && (
          <p className="mt-2 text-red-600">
            این دسته {deletingCategory.itemCount} آیتم دارد. ابتدا آیتم‌ها را به دسته دیگری منتقل کنید.
          </p>
        )}
      </DeleteConfirmModal>

      <ItemModal
        key={editingItem?.id ?? `new-${newItemCategoryId ?? "default"}`}
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={editingItem ? handleUpdateItem : handleCreateItem}
        categories={categories.map((c) => ({ id: c.id, nameFa: c.nameFa }))}
        initial={editingItem ?? undefined}
        targetCategoryId={newItemCategoryId}
      />

      <DeleteConfirmModal
        open={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteItem}
        title={`حذف "${deletingItem?.nameFa ?? ""}"`}
      >
        <p>آیتم {deletingItem?.nameFa} حذف شود؟ این عمل قابل بازگشت نیست.</p>
      </DeleteConfirmModal>

      <Modal
        open={!!importResults}
        onClose={() => setImportResults(null)}
        title="نتیجه ورودی CSV"
      >
        {importResults && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="text-ink">مجموع: {importResults.summary.total}</span>
              <span className="text-green-700">ایجاد: {importResults.summary.created}</span>
              {importResults.summary.skipped > 0 && (
                <span className="text-amber-700">رد شده: {importResults.summary.skipped}</span>
              )}
              {importResults.summary.errors > 0 && (
                <span className="text-red-700">خطا: {importResults.summary.errors}</span>
              )}
            </div>
            {importResults.details.some((d) => d.status !== "created") && (
              <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                {importResults.details
                  .filter((d) => d.status !== "created")
                  .map((d) => (
                    <div key={d.row} className="rounded bg-red-50 px-2 py-1 text-red-700">
                      سطر {d.row}: {d.nameFa || "(بدون نام)"} — {d.message}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

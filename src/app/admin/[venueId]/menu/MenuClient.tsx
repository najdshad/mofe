"use client";

import { useState, useRef, useEffect } from "react";
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
import { GripIcon, EditIcon, DeleteIcon } from "@/components/ui/Icons";
import { fetchApi } from "@/lib/fetch-api";
import { ALLERGEN_LABELS } from "@/lib/allergens";
import { useRouter } from "next/navigation";

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
  isSoldOut: boolean;
  description: string | null;
  calories: number | null;
  displayOrder: number;
  photoAssetId: string | null;
}

interface Publication {
  id: string;
  status: string;
  trigger: string;
  createdAt: string;
  createdAtLabel: string;
}

interface MenuClientProps {
  venueId: string;
  categories: Category[];
  items: Item[];
  canPublish: boolean;
  venuePublicStatus: string;
  hasUnpublishedChanges: boolean;
  publicUrl: string;
  publications: Publication[];
}

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
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition-colors ${
        selected ? "border-ink bg-ink/5" : "border-line hover:border-ink"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-1 text-ink-muted hover:text-ink transition-colors"
        title="جابجایی"
        suppressHydrationWarning
      >
        <GripIcon size={16} />
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

const COL_TEMPLATE = "36px 2fr 1fr 0.8fr 1fr 0.5fr";

function ItemRowContent({
  item,
  onToggleSoldOut,
  onEdit,
  onDelete,
}: {
  item: Item;
  onToggleSoldOut: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-start min-w-0">
        <div className="min-w-0 overflow-hidden">
          <div className="truncate font-serif text-lg text-ink">{item.nameFa}</div>
          {item.nameEn && (
            <div className="truncate mt-0.5 text-sm text-ink-muted">{item.nameEn}</div>
          )}
          {item.description && (
            <div className="mt-1 truncate text-xs leading-relaxed text-ink-muted">
              {item.description}
            </div>
          )}
          {item.calories && <Badge variant="muted">{item.calories} kcal</Badge>}
        </div>
      </div>
      <div className="flex items-center justify-center">
        <span className="text-sm text-ink">{item.priceFormatted}</span>
        <span className="mr-1 text-xs text-ink-muted">تومان</span>
      </div>
      <div className="flex items-center justify-center">
        <Badge variant="muted">
          {item.station === "bar" ? "بار" : "آشپزخانه"}
        </Badge>
      </div>
      <div className="flex items-center justify-center">
        <button
          onClick={() => onToggleSoldOut(!item.isSoldOut)}
          className={`w-full rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            item.isSoldOut
              ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >
          {item.isSoldOut ? "ناموجود" : "موجود"}
        </button>
      </div>
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={onEdit}
          className="p-1 text-ink-muted hover:text-ink transition-colors"
          title="ویرایش"
        >
          <EditIcon size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-ink-muted hover:text-red-600 transition-colors"
          title="حذف"
        >
          <DeleteIcon size={14} />
        </button>
      </div>
    </>
  );
}

function SortableItemRow({
  item,
  index,
  total,
  selectionMode,
  checked,
  onToggleCheck,
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
          style={{ ...style, gridTemplateColumns: COL_TEMPLATE }}
          className={`grid items-center gap-2 px-3 py-3 ${
            index !== total - 1 ? "border-b border-line/50" : ""
          }`}
        >
      <div className="flex items-center justify-center gap-1">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-0.5 text-ink-muted/40 hover:text-ink-muted transition-colors"
          title="جابجایی"
          suppressHydrationWarning
        >
          <GripIcon size={14} />
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
      <ItemRowContent
        item={item}
        onToggleSoldOut={onToggleSoldOut}
        onEdit={onEdit}
        onDelete={onDelete}
      />
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
  venueId,
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
    isSoldOut: boolean;
  }) => Promise<void>;
  categories: { id: string; nameFa: string }[];
  initial?: Item;
  targetCategoryId?: string;
  venueId: string;
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
  const [isSoldOut] = useState(initial?.isSoldOut ?? false);
  const [photoAssetId, setPhotoAssetId] = useState(initial?.photoAssetId ?? null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [variants, setVariants] = useState<{ nameFa: string; nameEn: string; priceModifier: number }[] | null>(null);
  const [prices, setPrices] = useState<{ description: string; priceToman: number }[] | null>(null);
  const [allergenCodes, setAllergenCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && initial) {
      fetch(`/api/venues/${venueId}/items/${initial.id}/variants`)
        .then((r) => r.json())
          .then((data) => {
          if (Array.isArray(data)) {
            setVariants(data.map((v: { nameFa: string; nameEn: string | null; priceModifier: number }) => ({
              nameFa: v.nameFa,
              nameEn: v.nameEn ?? "",
              priceModifier: v.priceModifier,
            })));
          } else {
            setVariants([]);
          }
        })
        .catch((e) => { console.error("Failed to load variants:", e); setVariants([]); });
      fetch(`/api/venues/${venueId}/items/${initial.id}/prices`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setPrices(data.map((p: { description: string; priceToman: number }) => ({
              description: p.description,
              priceToman: p.priceToman,
            })));
          } else {
            setPrices([]);
          }
        })
        .catch((e) => { console.error("Failed to load prices:", e); setPrices([]); });
      fetch(`/api/venues/${venueId}/items/${initial.id}/allergens`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setAllergenCodes(data);
        })
        .catch((e) => { console.error("Failed to load allergens:", e); setAllergenCodes([]); });
    }
  }, [open, initial, venueId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !initial) return;
    setPhotoLoading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/venues/${venueId}/items/${initial.id}/photo`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setPhotoAssetId(data.photoUrl);
      }
    } catch (e) {
      console.error("Photo upload failed:", e);
    } finally {
      setPhotoLoading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    if (!initial) return;
    setPhotoLoading(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/items/${initial.id}/photo`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPhotoAssetId(null);
      }
    } catch (e) {
      console.error("Photo delete failed:", e);
    } finally {
      setPhotoLoading(false);
    }
  };

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
        isSoldOut,
      });
      if (initial && variants) {
        await fetch(`/api/venues/${venueId}/items/${initial.id}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variants: variants.map((v) => ({
              nameFa: v.nameFa,
              nameEn: v.nameEn || null,
              priceModifier: v.priceModifier,
            })),
          }),
        });
      }
      if (initial && prices) {
        await fetch(`/api/venues/${venueId}/items/${initial.id}/prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prices: prices.map((p) => ({
              description: p.description,
              priceToman: p.priceToman,
            })),
          }),
        });
      }
      if (initial) {
        await fetch(`/api/venues/${venueId}/items/${initial.id}/allergens`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allergenCodes }),
        });
      }
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
        {initial && (
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
              عکس
            </label>
            <div className="flex items-center gap-3">
              {photoAssetId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoAssetId}
                  alt=""
                  className="h-16 w-16 rounded-xl border border-line object-cover"
                />
              )}
              <label className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted hover:border-ink hover:text-ink transition-colors">
                {photoLoading ? "..." : photoAssetId ? "تغییر عکس" : "افزودن عکس"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={photoLoading}
                />
              </label>
              {photoAssetId && (
                <button
                  onClick={handlePhotoDelete}
                  disabled={photoLoading}
                  className="text-xs text-ink-muted hover:text-red-600 transition-colors"
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        )}
        {initial && (
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
              تنوع‌ها / سایزها
            </label>
            <div className="space-y-2">
              {(variants ?? []).map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={v.nameFa}
                    onChange={(e) => {
                      const current = variants ?? [];
                      const next = [...current];
                      next[i] = { ...next[i], nameFa: e.target.value };
                      setVariants(next);
                    }}
                    placeholder="نام"
                    className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                  <input
                    value={v.nameEn}
                    onChange={(e) => {
                      const current = variants ?? [];
                      const next = [...current];
                      next[i] = { ...next[i], nameEn: e.target.value };
                      setVariants(next);
                    }}
                    placeholder="نام انگلیسی"
                    className="w-24 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={v.priceModifier !== 0 ? String((Number(priceToman) || 0) + v.priceModifier) : ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      const num = val ? Number(val) : 0;
                      const current = variants ?? [];
                      const next = [...current];
                      const base = Number(priceToman) || 0;
                      next[i] = { ...next[i], priceModifier: num - base };
                      setVariants(next);
                    }}
                    placeholder="قیمت"
                    className="w-24 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
                  />
                  <button
                    onClick={() => setVariants((prev) => (prev ?? []).filter((_, j) => j !== i))}
                    className="text-xs text-ink-muted hover:text-red-600 transition-colors"
                  >
                    حذف
                  </button>
                </div>
              ))}
              <button
                onClick={() => setVariants((prev) => [...(prev ?? []), { nameFa: "", nameEn: "", priceModifier: 0 }])}
                className="text-xs text-ink-muted hover:text-ink transition-colors"
              >
                + افزودن تنوع
              </button>
            </div>
          </div>
        )}
        {initial && (
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
              آلرژن‌ها
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ALLERGEN_LABELS).map(([code, label]) => (
                <label
                  key={code}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    allergenCodes.includes(code)
                      ? "border-ink bg-ink text-paper"
                      : "border-line text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allergenCodes.includes(code)}
                    onChange={() => {
                      setAllergenCodes((prev) =>
                        prev.includes(code)
                          ? prev.filter((c) => c !== code)
                          : [...prev, code]
                      );
                    }}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
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

export function MenuClient({
  venueId,
  categories: initialCategories,
  items: initialItems,
  canPublish,
  venuePublicStatus,
  hasUnpublishedChanges,
  publicUrl,
  publications,
}: MenuClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [isDragging, setIsDragging] = useState(false);
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

  const [dragError, setDragError] = useState("");

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [publishStatus, setPublishStatus] = useState("");
  const router = useRouter();

  const filteredItems = items
    .filter((item) => {
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

  const selectedCategoryName = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)?.nameFa ?? null
    : null;

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

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!window.confirm(`آیا از حذف ${selectedItems.size} آیتم انتخاب شده اطمینان دارید؟`)) return;
    const itemIds = Array.from(selectedItems);
    const res = await fetch(`/api/venues/${venueId}/items/bulk-delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds }),
    });
    if (!res.ok) return;
    const deletedItems = items.filter((i) => itemIds.includes(i.id));
    const countsByCategory: Record<string, number> = {};
    for (const item of deletedItems) {
      countsByCategory[item.categoryId] = (countsByCategory[item.categoryId] || 0) + 1;
    }
    setItems((prev) => prev.filter((i) => !itemIds.includes(i.id)));
    setCategories((prev) =>
      prev.map((c) =>
        countsByCategory[c.id]
          ? { ...c, itemCount: Math.max(0, c.itemCount - countsByCategory[c.id]) }
          : c
      )
    );
    setSelectedItems(new Set());
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sorted = [...categories].sort((a, b) => a.displayOrder - b.displayOrder);
    const oldIndex = sorted.findIndex((c) => c.id === active.id);
    const newIndex = sorted.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    const updates = reordered.map((cat, idx) => ({ id: cat.id, displayOrder: idx }));
    const prev = [...categories];
    setCategories((prev) =>
      prev.map((cat) => {
        const u = updates.find((x) => x.id === cat.id);
        return u ? { ...cat, displayOrder: u.displayOrder } : cat;
      })
    );
    setDragError("");
    try {
      const res = await fetch(`/api/venues/${venueId}/categories/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: updates }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      setCategories(prev);
      setDragError("خطا در ذخیره ترتیب دسته‌ها");
    }
  };

  const handleItemDragEnd = async (event: DragEndEvent) => {
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
    const prev = [...items];
    setItems((prev) =>
      prev.map((item) => {
        const u = updates.find((x) => x.id === item.id);
        return u ? { ...item, displayOrder: u.displayOrder } : item;
      })
    );
    setDragError("");
    try {
      const res = await fetch(`/api/venues/${venueId}/items/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: updates }),
      });
      if (!res.ok) throw new Error("Reorder failed");
    } catch {
      setItems(prev);
      setDragError("خطا در ذخیره ترتیب آیتم‌ها");
    }
  };

  const handleCreateCategory = async (nameFa: string) => {
    const created = await fetchApi(`/api/venues/${venueId}/categories`, {
      method: "POST",
      body: JSON.stringify({ nameFa }),
    });
    setCategories((prev) => [
      ...prev,
      { ...created, itemCount: 0 },
    ]);
  };

  const handleUpdateCategory = async (nameFa: string) => {
    if (!editingCategory) return;
    await fetchApi(
      `/api/venues/${venueId}/categories/${editingCategory.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ nameFa }),
      }
    );
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingCategory.id ? { ...c, nameFa } : c
      )
    );
    setEditingCategory(null);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    await fetchApi(
      `/api/venues/${venueId}/categories/${deletingCategory.id}`,
      { method: "DELETE" }
    );
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
    isSoldOut: boolean;
  }) => {
    const created = await fetchApi(`/api/venues/${venueId}/items`, {
      method: "POST",
      body: JSON.stringify(data),
    });
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
        isSoldOut: created.isSoldOut,
        description: created.description,
        calories: created.calories,
        displayOrder: created.displayOrder,
        photoAssetId: created.photoAssetId ?? null,
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
    isSoldOut: boolean;
  }) => {
    if (!editingItem) return;
    await fetchApi(
      `/api/venues/${venueId}/items/${editingItem.id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
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
              isSoldOut: data.isSoldOut,
            }
          : i
      )
    );
    setEditingItem(null);
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    await fetchApi(
      `/api/venues/${venueId}/items/${deletingItem.id}`,
      { method: "DELETE" }
    );
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
    const a = document.createElement("a");
    a.href = `/api/venues/${venueId}/items/export-csv`;
    a.download = `menu-items-${venueId}.csv`;
    a.click();
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

  const handlePublish = async () => {
    setPublishing(true);
    const res = await fetch(`/api/venues/${venueId}/publish`, { method: "POST" });
    if (res.ok) {
      setShowPublishModal(false);
      setPublishStatus("منو با موفقیت منتشر شد");
      router.refresh();
    } else {
      setPublishStatus("خطا در انتشار منو");
    }
    setPublishing(false);
  };

  const handleUnpublish = async () => {
    setPublishing(true);
    const res = await fetch(`/api/venues/${venueId}/unpublish`, { method: "POST" });
    if (res.ok) {
      setShowUnpublishModal(false);
      setPublishStatus("منو از دسترس خارج شد");
      router.refresh();
    } else {
      setPublishStatus("خطا در لغو انتشار");
    }
    setPublishing(false);
  };

  const handleNewItem = (categoryId?: string) => {
    setEditingItem(null);
    setNewItemCategoryId(categoryId);
    setItemModalOpen(true);
  };

  const categoryDndIds = categories.map((c) => c.id);

  return (
    <>
      <div className="mb-4 rounded-2xl border border-line bg-surface px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-block h-2 w-2 rounded-full ${
              venuePublicStatus === "published"
                ? hasUnpublishedChanges ? "bg-amber-500" : "bg-green-500"
                : venuePublicStatus === "unpublished"
                  ? "bg-red-400"
                  : "bg-gray-400"
            }`} />
            <span className="text-sm text-ink whitespace-nowrap">
              {venuePublicStatus === "published" ? "منتشر شده" : venuePublicStatus === "unpublished" ? "منتشر نشده" : "پیش‌نویس"}
            </span>
          </div>

          <span className="hidden sm:inline text-xs text-ink-muted truncate min-w-0" dir="ltr">
            {publicUrl}
          </span>

          {hasUnpublishedChanges && (
            <span className="text-xs text-amber-600 shrink-0 whitespace-nowrap">⚠️ تغییرات منتشرنشده</span>
          )}

          {publishStatus && (
            <span className="text-xs text-ink-muted shrink-0">{publishStatus}</span>
          )}
          {dragError && (
            <span className="text-xs text-red-600 shrink-0">{dragError}</span>
          )}

          <div className="mr-auto flex items-center gap-2 shrink-0">
            {venuePublicStatus === "published" ? (
              <>
                <button
                  onClick={() => setShowPublishModal(true)}
                  disabled={!canPublish}
                  className="rounded-full border border-line px-3 py-1 text-xs text-ink hover:border-ink transition-colors disabled:opacity-40"
                >
                  انتشار مجدد
                </button>
                <button
                  onClick={() => setShowUnpublishModal(true)}
                  disabled={!canPublish}
                  className="rounded-full border border-line px-3 py-1 text-xs text-ink-muted hover:text-ink hover:border-ink transition-colors disabled:opacity-40"
                >
                  لغو انتشار
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowPublishModal(true)}
                disabled={!canPublish}
                className="rounded-full border border-ink bg-ink px-3 py-1 text-xs text-paper hover:opacity-90 transition-colors disabled:opacity-40"
              >
                انتشار منو
              </button>
            )}

            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1 text-ink-muted hover:text-ink transition-colors ${showHistory ? "rotate-180" : ""}`}
              title="تاریخچه انتشار"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="mt-3 border-t border-line pt-3">
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
              <div className="grid grid-cols-[1fr_80px_1fr] gap-2 border-b border-line bg-paper px-3 py-2 text-[11px] uppercase tracking-wider text-ink-muted">
                <div>تاریخ</div>
                <div>وضعیت</div>
                <div>علت</div>
              </div>
              {publications.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-ink-muted">
                  هیچ انتشاری یافت نشد
                </div>
              ) : (
                publications.map((pub, idx) => (
                  <div
                    key={pub.id}
                    className={`grid grid-cols-[1fr_80px_1fr] items-center gap-2 px-3 py-2.5 ${
                      idx !== publications.length - 1 ? "border-b border-line/50" : ""
                    }`}
                  >
                    <div className="text-sm text-ink">{pub.createdAtLabel}</div>
                    <div>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          pub.status === "published"
                            ? "bg-green-100 text-green-800"
                            : pub.status === "unpublished"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {pub.status === "published"
                          ? "منتشر شده"
                          : pub.status === "unpublished"
                            ? "منتشر نشده"
                            : "در صف"}
                      </span>
                    </div>
                    <div className="text-sm text-ink-muted">
                      {pub.trigger === "manual_publish" ? "انتشار" : "لغو انتشار"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_1fr]">
        <Panel title="دسته‌ها" subtitle="مدیریت دسته‌بندی آیتم‌ها">
          <div className="space-y-2">
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-2.5 text-sm text-ink-muted hover:border-ink hover:text-ink transition-colors"
            >
              + افزودن دسته
            </button>

            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`w-full rounded-2xl border px-3 py-2.5 text-right text-sm transition-colors ${
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

        <div className="space-y-3">
          <Panel title={selectedCategoryName ?? "آیتم‌ها"}>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="sm:flex-1">
                <Input
                  label="جستجو"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="نام فارسی یا انگلیسی..."
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
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
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-ink/20 bg-ink/5 px-3 py-2.5">
                <span className="text-sm text-ink">
                  {selectedItems.size} آیتم انتخاب شده
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                >
                  حذف آیتم‌های انتخاب شده
                </Button>
                <button
                  onClick={handleClearSelection}
                  className="mr-auto text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  لغو انتخاب
                </button>
              </div>
            )}

            <div className={`${isDragging ? "overflow-visible" : "overflow-hidden"} rounded-[var(--radius-card)] border border-line`}>

              {selectedCategoryId ? (
                <DndContext
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={(e) => { setIsDragging(false); handleItemDragEnd(e); }}
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
                    style={{ gridTemplateColumns: selectionMode ? COL_TEMPLATE : "2fr 1fr 0.8fr 1fr 0.5fr" }}
                    className={`grid items-center gap-2 px-4 py-3 ${
                      idx !== filteredItems.length - 1
                        ? "border-b border-line/50"
                        : ""
                    }`}
                  >
                    {selectionMode && (
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="rounded border-line text-ink focus:ring-ink cursor-pointer"
                        />
                      </div>
                    )}
                    <ItemRowContent
                      item={item}
                      onToggleSoldOut={(v) => handleToggleSoldOut(item.id, v)}
                      onEdit={() => {
                        setEditingItem(item);
                        setItemModalOpen(true);
                      }}
                      onDelete={() => setDeletingItem(item)}
                    />
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
        venueId={venueId}
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

      <Modal
        open={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={handlePublish}
        title="انتشار منو"
        confirmLabel="انتشار"
        loading={publishing}
      >
        <p>
          با انتشار منو، نسخه جدید در آدرس عمومی قابل مشاهده خواهد بود.
          این تغییر بلافاصله اعمال می‌شود.
        </p>
      </Modal>

      <Modal
        open={showUnpublishModal}
        onClose={() => setShowUnpublishModal(false)}
        onConfirm={handleUnpublish}
        title="لغو انتشار"
        confirmLabel="لغو انتشار"
        confirmVariant="destructive"
        loading={publishing}
      >
        <p>
          با لغو انتشار، بازدیدکنندگان QR صفحه «منو در دسترس نیست» را
          مشاهده خواهند کرد.
        </p>
      </Modal>
    </>
  );
}

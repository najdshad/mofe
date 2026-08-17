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
import {
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Layers3,
  ListChecks,
  Plus,
  Search,
  Upload,
  Utensils,
} from "lucide-react";

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
  isSoldOut: boolean;
  description: string | null;
  calories: number | null;
  displayOrder: number;
  photoUrl: string | null;
}

interface MenuClientProps {
  venueId: string;
  categories: Category[];
  items: Item[];
  publicUrl: string;
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
      className={`group flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${
        selected ? "border-ink bg-ink text-paper" : "border-transparent bg-white/45 hover:border-line hover:bg-white"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className={`cursor-grab touch-none rounded-lg p-1 transition-colors ${
          selected ? "text-paper/45 hover:text-paper" : "text-ink-muted/45 hover:text-ink"
        }`}
        title="جابجایی"
        suppressHydrationWarning
      >
        <GripIcon size={16} />
      </button>
      <button onClick={onSelect} className="min-w-0 flex-1 text-right">
        <span className={`block truncate text-sm font-medium ${selected ? "text-paper" : "text-ink"}`}>{cat.nameFa}</span>
        <span className={`mt-0.5 block text-[10px] ${selected ? "text-paper/55" : "text-ink-muted"}`}>
          {cat.itemCount} آیتم
        </span>
      </button>
      <div className="shrink-0 flex items-center gap-1">
        <button
          onClick={onEdit}
          className={`rounded-lg p-1.5 transition-colors ${
            selected ? "text-paper/55 hover:bg-paper/10 hover:text-paper" : "text-ink-muted hover:bg-ink/5 hover:text-ink"
          }`}
          title="ویرایش"
        >
          <EditIcon size={13} />
        </button>
        <button
          onClick={onDelete}
          className={`rounded-lg p-1.5 transition-colors ${
            selected ? "text-paper/55 hover:bg-red-400/15 hover:text-red-200" : "text-ink-muted hover:bg-red-50 hover:text-red-700"
          }`}
          title="حذف"
        >
          <DeleteIcon size={13} />
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle
            on={cat.active}
            onChange={(active) => onToggleActive(active)}
            aria-label={`${cat.active ? "غیرفعال کردن" : "فعال کردن"} دسته ${cat.nameFa}`}
          />
        </div>
      </div>
    </div>
  );
}

const COL_TEMPLATE = "38px minmax(220px,2fr) minmax(110px,0.8fr) minmax(100px,0.8fr) 76px";

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
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line/80 bg-canvas text-ink-muted">
          {item.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Utensils className="h-4 w-4 opacity-45" strokeWidth={1.6} />
          )}
        </div>
        <div className="min-w-0 overflow-hidden">
          <div className="truncate text-sm font-bold text-ink">{item.nameFa}</div>
          {item.nameEn && (
            <div className="mt-0.5 truncate text-xs text-ink-muted" dir="ltr">{item.nameEn}</div>
          )}
          {item.description && (
            <div className="mt-1 truncate text-[11px] leading-relaxed text-ink-muted">
              {item.description}
            </div>
          )}
          {item.calories && <Badge variant="muted">{item.calories} kcal</Badge>}
        </div>
      </div>
      <div className="flex items-baseline justify-start">
        <span className="text-sm font-bold text-ink">{item.priceFormatted}</span>
        <span className="mr-1 text-[10px] text-ink-muted">تومان</span>
      </div>
      <div className="flex items-center justify-start">
        <button
          onClick={() => onToggleSoldOut(!item.isSoldOut)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
            item.isSoldOut
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${item.isSoldOut ? "bg-red-500" : "bg-emerald-500"}`} />
          {item.isSoldOut ? "ناموجود" : "موجود"}
        </button>
      </div>
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
          title="ویرایش"
        >
          <EditIcon size={15} />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-red-50 hover:text-red-700"
          title="حذف"
        >
          <DeleteIcon size={15} />
        </button>
      </div>
    </>
  );
}

function MobileItemRowContent({
  item,
  selectionMode,
  checked,
  onToggleCheck,
  onToggleSoldOut,
  onEdit,
  onDelete,
  dragHandle,
}: {
  item: Item;
  selectionMode: boolean;
  checked: boolean;
  onToggleCheck: () => void;
  onToggleSoldOut: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  dragHandle?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 px-3 py-3 md:hidden">
      <div className="flex shrink-0 flex-col items-center gap-2 pt-1">
        {dragHandle}
        {selectionMode && (
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleCheck}
            className="h-4 w-4 rounded border-line text-ink focus:ring-ink"
          />
        )}
      </div>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line/80 bg-canvas text-ink-muted">
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Utensils className="h-5 w-5 opacity-40" strokeWidth={1.6} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{item.nameFa}</p>
            {item.nameEn && <p className="mt-0.5 truncate text-[11px] text-ink-muted" dir="ltr">{item.nameEn}</p>}
          </div>
          <p className="shrink-0 text-xs font-bold text-ink">
            {item.priceFormatted}
            <span className="mr-1 text-[9px] font-normal text-ink-muted">تومان</span>
          </p>
        </div>
        {item.description && <p className="mt-1 line-clamp-1 text-[11px] text-ink-muted">{item.description}</p>}
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            onClick={() => onToggleSoldOut(!item.isSoldOut)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-medium ${
              item.isSoldOut ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${item.isSoldOut ? "bg-red-500" : "bg-emerald-500"}`} />
            {item.isSoldOut ? "ناموجود" : "موجود"}
          </button>
          <div className="flex items-center">
            <button onClick={onEdit} className="rounded-lg p-2 text-ink-muted hover:bg-ink/5 hover:text-ink" aria-label={`ویرایش ${item.nameFa}`}>
              <EditIcon size={15} />
            </button>
            <button onClick={onDelete} className="rounded-lg p-2 text-ink-muted hover:bg-red-50 hover:text-red-700" aria-label={`حذف ${item.nameFa}`}>
              <DeleteIcon size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
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
      style={style}
      className={`${index !== total - 1 ? "border-b border-line/70" : ""} bg-panel transition-colors hover:bg-white`}
    >
      <div style={{ gridTemplateColumns: COL_TEMPLATE }} className="hidden items-center gap-2 px-3 py-3 md:grid">
        <div className="flex items-center justify-center gap-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded-lg p-1 text-ink-muted/35 transition-colors hover:bg-ink/5 hover:text-ink-muted"
            title="جابجایی"
            suppressHydrationWarning
          >
            <GripIcon size={15} />
          </button>
          {selectionMode && (
            <input
              type="checkbox"
              checked={checked}
              onChange={onToggleCheck}
              className="cursor-pointer rounded border-line text-ink focus:ring-ink"
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
      <MobileItemRowContent
        item={item}
        selectionMode={selectionMode}
        checked={checked}
        onToggleCheck={onToggleCheck}
        onToggleSoldOut={onToggleSoldOut}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandle={
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none rounded-lg p-1 text-ink-muted/45"
            title="جابجایی"
            suppressHydrationWarning
          >
            <GripIcon size={15} />
          </button>
        }
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
  const [description, setDescription] = useState(initial?.description ?? "");
  const [calories, setCalories] = useState(String(initial?.calories ?? ""));
  const [isSoldOut] = useState(initial?.isSoldOut ?? false);
  const [photoUrl, setPhotoAssetId] = useState(initial?.photoUrl ?? null);
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
      const data = await fetchApi(`/api/venues/${venueId}/items/${initial.id}/photo`, {
        method: "POST",
        body: formData,
      });
      setPhotoAssetId(data.photoUrl);
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
      await fetchApi(`/api/venues/${venueId}/items/${initial.id}/photo`, {
        method: "DELETE",
      });
      setPhotoAssetId(null);
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
        description: description.trim() || undefined,
        calories: calories ? Number(calories) : undefined,
        isSoldOut,
      });
      if (initial && variants) {
        await fetchApi(`/api/venues/${venueId}/items/${initial.id}/variants`, {
          method: "POST",
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
        await fetchApi(`/api/venues/${venueId}/items/${initial.id}/prices`, {
          method: "POST",
          body: JSON.stringify({
            prices: prices.map((p) => ({
              description: p.description,
              priceToman: p.priceToman,
            })),
          }),
        });
      }
      if (initial) {
        await fetchApi(`/api/venues/${venueId}/items/${initial.id}/allergens`, {
          method: "POST",
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
          <label className="block text-xs font-medium text-ink-muted">
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
          <label className="block text-xs font-medium text-ink-muted">
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
            <label className="block text-xs font-medium text-ink-muted">
              عکس
            </label>
<div className="flex items-center justify-center gap-3">
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt=""
                  className="h-16 w-16 rounded-xl border border-line object-cover"
                />
              )}
              <label className="cursor-pointer rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted hover:border-ink hover:text-ink transition-colors">
                {photoLoading ? "..." : photoUrl ? "تغییر عکس" : "افزودن عکس"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={photoLoading}
                />
              </label>
              {photoUrl && (
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
            <label className="block text-xs font-medium text-ink-muted">
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
            <label className="block text-xs font-medium text-ink-muted">
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
  publicUrl,
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
  const activeCategoryCount = categories.filter((category) => category.active).length;
  const availableItemCount = items.filter((item) => !item.isSoldOut).length;

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
    try {
      await fetchApi(`/api/venues/${venueId}/items/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ itemIds }),
      });
    } catch {
      return;
    }
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
      await fetchApi(`/api/venues/${venueId}/categories/reorder`, {
        method: "POST",
        body: JSON.stringify({ orders: updates }),
      });
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
      await fetchApi(`/api/venues/${venueId}/items/reorder`, {
        method: "POST",
        body: JSON.stringify({ orders: updates }),
      });
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
    await fetchApi(`/api/venues/${venueId}/categories/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify({ active }),
    });
  };

  const handleCreateItem = async (data: {
    nameFa: string;
    nameEn?: string;
    categoryId: string;
    priceToman: number;
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
        isSoldOut: created.isSoldOut,
        description: created.description,
        calories: created.calories,
        displayOrder: created.displayOrder,
        photoUrl: created.photoUrl ?? null,
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
    await fetchApi(`/api/venues/${venueId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ isSoldOut: soldOut }),
    });
  };

  const handleDownloadTemplate = () => {
    const a = document.createElement("a");
    a.href = `/api/venues/${venueId}/items/csv-template`;
    a.download = `menu-template-${venueId}.csv`;
    a.click();
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
      const data = await fetchApi(`/api/venues/${venueId}/items/import-csv`, {
        method: "POST",
        body: JSON.stringify({ csv: text }),
      });
      setImportResults(data);
      if (data.summary?.created > 0) {
        window.location.reload();
      }
    } catch (e) {
      setImportResults({
        summary: { total: 0, created: 0, skipped: 0, errors: 1 },
        details: [{ row: 0, status: "error", nameFa: "", message: e instanceof Error ? e.message : "خطا در خواندن فایل" }],
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
      <header className="flex flex-col gap-5 border-b border-line/90 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold text-accent">منوی دیجیتال</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">مدیریت منو</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            دسته‌ها، قیمت‌ها و وضعیت موجودی را از یک فضای سریع و مرتب مدیریت کنید.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink/40 hover:bg-white"
          >
            مشاهده منو
            <ExternalLink className="h-4 w-4 text-ink-muted" strokeWidth={1.8} />
          </a>
          <Button onClick={() => handleNewItem(selectedCategoryId ?? undefined)}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            افزودن آیتم
          </Button>
          {dragError && (
            <span className="text-xs text-red-600 shrink-0">{dragError}</span>
          )}
        </div>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4">
        <div className="rounded-2xl border border-line bg-panel p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-ink-muted">
            <Utensils className="h-4 w-4" strokeWidth={1.7} />
            <span className="hidden text-xs sm:inline">کل آیتم‌ها</span>
          </div>
          <p className="mt-2 text-xl font-bold text-ink sm:text-2xl">{items.length.toLocaleString("fa-IR")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-ink-muted">
            <Layers3 className="h-4 w-4" strokeWidth={1.7} />
            <span className="hidden text-xs sm:inline">دسته فعال</span>
          </div>
          <p className="mt-2 text-xl font-bold text-ink sm:text-2xl">{activeCategoryCount.toLocaleString("fa-IR")}</p>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-3.5 sm:p-4">
          <div className="flex items-center gap-2 text-ink-muted">
            <CheckCircle2 className="h-4 w-4" strokeWidth={1.7} />
            <span className="hidden text-xs sm:inline">آیتم موجود</span>
          </div>
          <p className="mt-2 text-xl font-bold text-ink sm:text-2xl">{availableItemCount.toLocaleString("fa-IR")}</p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-8">
        <Panel title="دسته‌بندی‌ها" subtitle={`${categories.length.toLocaleString("fa-IR")} دسته برای مرتب‌سازی منو`}>
          <div className="space-y-2">
            <button
              onClick={() => {
                setEditingCategory(null);
                setCategoryModalOpen(true);
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-white/35 py-2.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent/50 hover:bg-accent-soft/45 hover:text-accent"
            >
              <Plus className="h-4 w-4" />
              افزودن دسته جدید
            </button>

            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-right text-sm transition-colors ${
                selectedCategoryId === null
                  ? "border-ink bg-ink text-paper"
                  : "border-transparent bg-white/45 hover:border-line hover:bg-white"
              }`}
            >
              <ListChecks className={`h-4 w-4 ${selectedCategoryId === null ? "text-paper/65" : "text-ink-muted"}`} />
              <span className="flex-1">همه آیتم‌ها</span>
              <span className={`text-[10px] ${selectedCategoryId === null ? "text-paper/55" : "text-ink-muted"}`}>
                {items.length.toLocaleString("fa-IR")}
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
        </div>

        <Panel
          title={selectedCategoryName ?? "همه آیتم‌ها"}
          subtitle={`${filteredItems.length.toLocaleString("fa-IR")} آیتم در این نما`}
        >
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/60" strokeWidth={1.8} />
                  <input
                    aria-label="جستجوی آیتم‌ها"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجوی نام فارسی یا انگلیسی"
                    className="h-10 w-full rounded-xl border border-line bg-white/70 pr-10 pl-3 text-sm text-ink placeholder:text-ink-muted/45 focus:border-accent/60 focus:outline-none focus:ring-3 focus:ring-accent/10"
                  />
                </div>
                <button
                  onClick={() => {
                    if (selectionMode) {
                      setSelectionMode(false);
                      setSelectedItems(new Set());
                    } else {
                      setSelectionMode(true);
                    }
                  }}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors ${
                    selectionMode
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-panel text-ink-muted hover:border-ink/40 hover:bg-white hover:text-ink"
                  }`}
                >
                  <ListChecks className="h-4 w-4" />
                  {selectionMode ? "پایان انتخاب" : "انتخاب چندتایی"}
                </button>
                <details className="group relative">
                  <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-line bg-panel px-3 text-xs font-medium text-ink-muted transition-colors hover:border-ink/40 hover:bg-white hover:text-ink">
                    <FileSpreadsheet className="h-4 w-4" />
                    ابزار CSV
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="absolute left-0 top-12 z-20 w-48 overflow-hidden rounded-xl border border-line bg-panel p-1.5 shadow-xl">
                    <button onClick={handleDownloadTemplate} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-xs text-ink-muted hover:bg-ink/5 hover:text-ink">
                      <FileSpreadsheet className="h-4 w-4" />
                      دریافت قالب CSV
                    </button>
                    <button onClick={handleExportCSV} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-xs text-ink-muted hover:bg-ink/5 hover:text-ink">
                      <Download className="h-4 w-4" />
                      خروجی از منو
                    </button>
                    <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-right text-xs text-ink-muted hover:bg-ink/5 hover:text-ink">
                      <Upload className="h-4 w-4" />
                      {importing ? "در حال ورود..." : "ورود فایل CSV"}
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
                </details>
              </div>
            </div>

            {selectionMode && selectedItems.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent/20 bg-accent-soft/45 px-3 py-2.5">
                <span className="text-sm text-ink">
                  {selectedItems.size.toLocaleString("fa-IR")} آیتم انتخاب شده
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

            <div className={`${isDragging ? "overflow-visible" : "overflow-hidden"} rounded-[var(--radius-card)] border border-line bg-panel`}>
              <div
                style={{ gridTemplateColumns: COL_TEMPLATE }}
                className="hidden items-center gap-2 border-b border-line bg-canvas/70 px-3 py-2 text-[10px] font-bold text-ink-muted md:grid"
              >
                <span />
                <span>آیتم</span>
                <span>قیمت</span>
                <span>وضعیت</span>
                <span className="text-center">عملیات</span>
              </div>

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
                    className={`bg-panel transition-colors hover:bg-white ${
                      idx !== filteredItems.length - 1
                        ? "border-b border-line/70"
                        : ""
                    }`}
                  >
                    <div
                      style={{ gridTemplateColumns: COL_TEMPLATE }}
                      className="hidden items-center gap-2 px-3 py-3 md:grid"
                    >
                      <div className="flex items-center justify-center">
                        {selectionMode && (
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="cursor-pointer rounded border-line text-ink focus:ring-ink"
                          />
                        )}
                      </div>
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
                    <MobileItemRowContent
                      item={item}
                      selectionMode={selectionMode}
                      checked={selectedItems.has(item.id)}
                      onToggleCheck={() => toggleItemSelection(item.id)}
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
                <div className="px-4 py-14 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-canvas text-ink-muted">
                    <Search className="h-5 w-5" strokeWidth={1.6} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-ink">آیتمی پیدا نشد</p>
                  <p className="mt-1 text-xs text-ink-muted">عبارت جستجو یا دسته انتخاب‌شده را تغییر دهید.</p>
                </div>
              )}
            </div>
        </Panel>
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
    </>
  );
}

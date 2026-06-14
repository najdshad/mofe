"use client";

import { useState } from "react";
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

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [newItemCategoryId, setNewItemCategoryId] = useState<string | undefined>();

  const filteredItems = items.filter((item) => {
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
  });

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

  const formatPrice = (price: number) =>
    price.toLocaleString("fa-IR");

  const handleNewItem = (categoryId?: string) => {
    setEditingItem(null);
    setNewItemCategoryId(categoryId);
    setItemModalOpen(true);
  };

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
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-3 transition-colors ${
                  selectedCategoryId === cat.id
                    ? "border-ink bg-ink/5"
                    : "border-line hover:border-ink"
                }`}
              >
                <button
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className="min-w-0 flex-1 text-right"
                >
                  <span className="block truncate text-sm text-ink">
                    {cat.nameFa}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    {cat.itemCount} آیتم
                  </span>
                </button>
                <div className="shrink-0 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCategory(cat);
                      setCategoryModalOpen(true);
                    }}
                    className="p-1 text-ink-muted hover:text-ink transition-colors"
                    title="ویرایش"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                  </button>
                  <button
                    onClick={() => setDeletingCategory(cat)}
                    className="p-1 text-ink-muted hover:text-red-600 transition-colors"
                    title="حذف"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Toggle
                      on={cat.active}
                      onChange={(active) => handleToggleCategoryActive(cat.id, active)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="آیتم‌ها">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <Input
                  label="جستجو"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="نام فارسی یا انگلیسی..."
                />
              </div>
              <select
                value={stationFilter}
                onChange={(e) => setStationFilter(e.target.value)}
                className="rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink"
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
            </div>

            <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
              <div className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_1fr_0.5fr] gap-3 border-b border-line bg-surface px-4 py-3 text-[11px] uppercase tracking-wider text-ink-muted">
                <div>نام</div>
                <div>قیمت</div>
                <div>ایستگاه</div>
                <div>نمایش عمومی</div>
                <div>وضعیت</div>
                <div />
              </div>
              {filteredItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`grid grid-cols-[2fr_1fr_0.8fr_0.8fr_1fr_0.5fr] items-center gap-3 px-4 py-4 ${
                    idx !== filteredItems.length - 1
                      ? "border-b border-line/50"
                      : ""
                  }`}
                >
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
                    {item.calories && (
                      <Badge muted>{item.calories} kcal</Badge>
                    )}
                  </div>
                  <div className="text-sm text-ink">
                    {formatPrice(item.priceToman)}
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
              ))}
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
    </>
  );
}

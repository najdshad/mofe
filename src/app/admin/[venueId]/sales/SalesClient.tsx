"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Download,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Tags,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Panel } from "@/components/ui/Panel";
import { fetchApi } from "@/lib/fetch-api";

type RangeKey = "day" | "week" | "month" | "quarter" | "year" | "all" | "custom";
type EntryFilter = "all" | "sale" | "expense";

interface MenuItem {
  id: string;
  nameFa: string;
  categoryNameFa: string;
  priceToman: number;
  variants: Array<{ id: string; nameFa: string; priceModifier: number }>;
}

interface SaleLineItem {
  id: string;
  menuItemId: string | null;
  itemName: string;
  variantName: string | null;
  unitPriceToman: number;
  quantity: number;
  totalToman: number;
}

interface LedgerEntry {
  id: string;
  type: "sale" | "expense";
  amountToman: number;
  description: string | null;
  tags: string[];
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  saleItems: SaleLineItem[];
}

interface SalesClientProps {
  venueId: string;
  defaultCustomFrom: string;
  defaultCustomTo: string;
  menuItems: MenuItem[];
  initialEntries: LedgerEntry[];
}

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "day", label: "روزانه" },
  { key: "week", label: "هفتگی" },
  { key: "month", label: "ماهانه" },
  { key: "quarter", label: "۳ ماه" },
  { key: "year", label: "سالانه" },
  { key: "all", label: "همه" },
  { key: "custom", label: "دلخواه" },
];

const moneyFormatter = new Intl.NumberFormat("fa-IR");
const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  calendar: "persian",
  year: "numeric",
  month: "short",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("fa-IR", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatMoney(value: number) {
  return moneyFormatter.format(value);
}

function toLocalInputValue(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 16);
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getRangeBounds(range: RangeKey, customFrom: string, customTo: string) {
  const now = new Date();
  if (range === "all") return { from: null, to: now };
  if (range === "custom") {
    if (!customFrom || !customTo) return null;
    const from = new Date(`${customFrom}T00:00:00`);
    const to = new Date(`${customTo}T23:59:59.999`);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
    return { from, to };
  }

  const dayCounts: Record<Exclude<RangeKey, "all" | "custom">, number> = {
    day: 1,
    week: 7,
    month: 30,
    quarter: 90,
    year: 365,
  };
  const from = startOfDay(now);
  from.setDate(from.getDate() - (dayCounts[range] - 1));
  return { from, to: now };
}

function rangeLabel(range: RangeKey, customFrom: string, customTo: string) {
  if (range !== "custom" || !customFrom || !customTo) {
    return RANGE_OPTIONS.find((option) => option.key === range)?.label ?? "";
  }
  return `${dateFormatter.format(new Date(`${customFrom}T00:00:00`))} تا ${dateFormatter.format(
    new Date(`${customTo}T00:00:00`),
  )}`;
}

function buildChartData(
  entries: LedgerEntry[],
  range: RangeKey,
  bounds: { from: Date | null; to: Date },
) {
  const entryDates = entries.map((entry) => new Date(entry.occurredAt).getTime());
  const fallbackFrom = startOfDay(new Date(bounds.to.getTime() - 29 * 24 * 60 * 60 * 1000));
  const from =
    bounds.from ??
    (entryDates.length ? startOfDay(new Date(Math.min(...entryDates))) : fallbackFrom);
  const to = bounds.to;
  const span = Math.max(to.getTime() - from.getTime(), 1);
  const bucketCount =
    range === "day" ? 6 : range === "week" ? 7 : range === "month" ? 10 : range === "quarter" ? 13 : 12;
  const bucketSize = span / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = new Date(from.getTime() + index * bucketSize);
    const shortSpan = span <= 24 * 60 * 60 * 1000;
    const label = shortSpan
      ? timeFormatter.format(bucketStart)
      : new Intl.DateTimeFormat("fa-IR", {
          calendar: "persian",
          month: span > 180 * 24 * 60 * 60 * 1000 ? "short" : undefined,
          day: "numeric",
        }).format(bucketStart);
    return { label, sales: 0, expenses: 0 };
  });

  for (const entry of entries) {
    const time = new Date(entry.occurredAt).getTime();
    if (time < from.getTime() || time > to.getTime()) continue;
    const index = Math.min(Math.floor((time - from.getTime()) / bucketSize), bucketCount - 1);
    if (entry.type === "sale") buckets[index].sales += entry.amountToman;
    else buckets[index].expenses += entry.amountToman;
  }

  return buckets;
}

function AmountInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      <div className="relative">
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-[var(--radius-control)] border border-line bg-white/70 px-3.5 py-2.5 pl-16 text-sm text-ink placeholder:text-ink-muted/45 focus:border-accent/60 focus:outline-none focus-visible:ring-3 focus-visible:ring-accent/10"
        />
        <span className="absolute inset-y-0 left-3 flex items-center text-[11px] text-ink-muted">تومان</span>
      </div>
    </label>
  );
}

function SaleModal({
  open,
  menuItems,
  onClose,
  onSave,
}: {
  open: boolean;
  menuItems: MenuItem[];
  onClose: () => void;
  onSave: (payload: {
    type: "sale";
    occurredAt: string;
    description: string | null;
    items: Array<{ menuItemId: string; quantity: number; variantId: string | null }>;
  }) => Promise<void>;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [variantByItem, setVariantByItem] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [occurredAt, setOccurredAt] = useState(toLocalInputValue());
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const priceOf = (item: MenuItem) => {
    const variant = item.variants.find((candidate) => candidate.id === variantByItem[item.id]);
    return item.priceToman + (variant?.priceModifier ?? 0);
  };

  const visibleItems = menuItems.filter(
    (item) =>
      item.nameFa.includes(search.trim()) || item.categoryNameFa.includes(search.trim()),
  );
  const selectedItems = menuItems.filter((item) => (quantities[item.id] ?? 0) > 0);
  const total = selectedItems.reduce(
    (sum, item) => sum + priceOf(item) * (quantities[item.id] ?? 0),
    0,
  );

  const setQuantity = (itemId: string, quantity: number) => {
    setQuantities((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[itemId];
      else next[itemId] = Math.min(quantity, 1000);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedItems.length) {
      setError("حداقل یک آیتم به سفارش اضافه کنید.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        type: "sale",
        occurredAt: new Date(occurredAt).toISOString(),
        description: description.trim() || null,
        items: selectedItems.map((item) => ({
          menuItemId: item.id,
          quantity: quantities[item.id],
          variantId: variantByItem[item.id] || null,
        })),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ثبت سفارش انجام نشد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      onConfirm={handleSave}
      title="ثبت سفارش تکمیل‌شده"
      confirmLabel={`ثبت فروش ${total ? `· ${formatMoney(total)} تومان` : ""}`}
      loading={saving}
    >
      <div className="space-y-4">
        <p className="text-xs leading-5 text-ink-muted">
          آیتم‌ها را انتخاب کنید؛ مبلغ فروش با قیمت فعلی منو محاسبه می‌شود.
        </p>

        {menuItems.length ? (
          <>
            <label className="relative block">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجوی آیتم یا دسته..."
                className="w-full rounded-xl border border-line bg-white/70 py-2.5 pr-9 pl-3 text-sm text-ink placeholder:text-ink-muted/45 focus:border-accent/60 focus:outline-none"
              />
            </label>

            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-line/80 bg-white/35 p-2">
              {visibleItems.length ? (
                visibleItems.map((item) => {
                  const quantity = quantities[item.id] ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl bg-panel px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{item.nameFa}</p>
                        <p className="mt-0.5 text-[10px] text-ink-muted">
                          {item.categoryNameFa} · {formatMoney(priceOf(item))} تومان
                        </p>
                        {item.variants.length > 0 && (
                          <select
                            value={variantByItem[item.id] ?? ""}
                            onChange={(event) =>
                              setVariantByItem((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            className="mt-1.5 w-full max-w-44 rounded-lg border border-line bg-white px-2 py-1 text-[10px] text-ink focus:border-accent/60 focus:outline-none"
                          >
                            <option value="">پایه</option>
                            {item.variants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.nameFa} · {formatMoney(item.priceToman + variant.priceModifier)} تومان
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-line bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity - 1)}
                          disabled={!quantity}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-ink/5 disabled:opacity-25"
                          aria-label={`کم کردن ${item.nameFa}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-ink">
                          {quantity.toLocaleString("fa-IR")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-paper hover:bg-ink/85"
                          aria-label={`اضافه کردن ${item.nameFa}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="px-3 py-8 text-center text-xs text-ink-muted">آیتمی پیدا نشد.</p>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs leading-6 text-ink-muted">
            ابتدا در تب مدیریت منو یک آیتم بسازید.
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">زمان سفارش</span>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className="w-full rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-sm text-ink focus:border-accent/60 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">یادداشت (اختیاری)</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={300}
            placeholder="مثلاً سفارش میز ۴"
            className="w-full rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/45 focus:border-accent/60 focus:outline-none"
          />
        </label>
        {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function ExpenseModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    type: "expense";
    amountToman: number;
    description: string | null;
    tags: string[];
    occurredAt: string;
  }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [occurredAt, setOccurredAt] = useState(toLocalInputValue());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    const amountToman = Number(amount);
    if (!Number.isInteger(amountToman) || amountToman <= 0) {
      setError("مبلغ هزینه را به تومان وارد کنید.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        type: "expense",
        amountToman,
        description: description.trim() || null,
        tags: tags
          .split(/[،,]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
        occurredAt: new Date(occurredAt).toISOString(),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ثبت هزینه انجام نشد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      onConfirm={handleSave}
      title="ثبت هزینه"
      confirmLabel="ثبت هزینه"
      loading={saving}
    >
      <div className="space-y-4">
        <AmountInput
          label="مبلغ هزینه"
          value={amount}
          onChange={setAmount}
          placeholder="مثلاً ۵۰۰۰۰۰"
        />
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">شرح هزینه</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={300}
            placeholder="مثلاً خرید شیر و قهوه"
            className="w-full rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/45 focus:border-accent/60 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <Tags className="h-3.5 w-3.5" />
            برچسب‌ها (اختیاری)
          </span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="مواد اولیه، اجاره، تعمیرات"
            className="w-full rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/45 focus:border-accent/60 focus:outline-none"
          />
          <span className="mt-1.5 block text-[10px] text-ink-muted">برچسب‌ها را با ویرگول جدا کنید.</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-ink-muted">زمان هزینه</span>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            className="w-full rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-sm text-ink focus:border-accent/60 focus:outline-none"
          />
        </label>
        {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function CashflowChart({
  entries,
  range,
  bounds,
}: {
  entries: LedgerEntry[];
  range: RangeKey;
  bounds: { from: Date | null; to: Date };
}) {
  const data = buildChartData(entries, range, bounds);
  const maxValue = Math.max(...data.flatMap((bucket) => [bucket.sales, bucket.expenses]), 1);

  return (
    <div>
      <div className="mb-5 flex items-center gap-4 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-success" />
          فروش
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
          هزینه
        </span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[560px] items-stretch gap-2" dir="ltr">
          {data.map((bucket, index) => (
            <div key={`${bucket.label}-${index}`} className="flex min-w-10 flex-1 flex-col items-center">
              <div className="flex h-20 w-full items-end justify-center gap-1 border-b border-line/80">
                <div
                  className="w-[34%] max-w-5 rounded-t-md bg-success/85 transition-[height]"
                  style={{ height: `${Math.max((bucket.sales / maxValue) * 72, bucket.sales ? 3 : 0)}px` }}
                  title={`فروش: ${formatMoney(bucket.sales)} تومان`}
                />
              </div>
              <div className="flex h-20 w-full items-start justify-center gap-1">
                <div
                  className="w-[34%] max-w-5 rounded-b-md bg-accent/85 transition-[height]"
                  style={{ height: `${Math.max((bucket.expenses / maxValue) * 72, bucket.expenses ? 3 : 0)}px` }}
                  title={`هزینه: ${formatMoney(bucket.expenses)} تومان`}
                />
              </div>
              <span className="mt-2 whitespace-nowrap text-[9px] text-ink-muted">{bucket.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SalesClient({
  venueId,
  defaultCustomFrom,
  defaultCustomTo,
  menuItems,
  initialEntries,
}: SalesClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [range, setRange] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState(defaultCustomFrom);
  const [customTo, setCustomTo] = useState(defaultCustomTo);
  const [entryFilter, setEntryFilter] = useState<EntryFilter>("all");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [saleOpen, setSaleOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const skipInitialFetch = useRef(true);

  const bounds = getRangeBounds(range, customFrom, customTo);

  const loadEntries = async () => {
    const currentBounds = getRangeBounds(range, customFrom, customTo);
    if (!currentBounds) return;

    setLoading(true);
    setStatus("");
    try {
      const searchParams = new URLSearchParams();
      if (currentBounds.from) searchParams.set("from", currentBounds.from.toISOString());
      searchParams.set("to", currentBounds.to.toISOString());
      const data = await fetchApi(`/api/venues/${venueId}/ledger?${searchParams.toString()}`);
      setEntries(data.entries);
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "دریافت دفتر فروش انجام نشد");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    void loadEntries();
    // loadEntries intentionally follows the selected range inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo]);

  const summary = useMemo(() => {
    let sales = 0;
    let expenses = 0;
    let orders = 0;
    for (const entry of entries) {
      if (entry.type === "sale") {
        sales += entry.amountToman;
        orders += 1;
      } else {
        expenses += entry.amountToman;
      }
    }
    return { sales, expenses, net: sales - expenses, orders };
  }, [entries]);

  const topItems = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const entry of entries) {
      for (const item of entry.saleItems) {
        const key = item.menuItemId ?? item.itemName;
        const current = totals.get(key) ?? { name: item.itemName, quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += item.totalToman;
        totals.set(key, current);
      }
    }
    return [...totals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [entries]);

  const visibleEntries = entries.filter(
    (entry) => entryFilter === "all" || entry.type === entryFilter,
  );

  const createEntry = async (payload: object) => {
    await fetchApi(`/api/venues/${venueId}/ledger`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSaleOpen(false);
    setExpenseOpen(false);
    await loadEntries();
    setStatus("تراکنش با موفقیت ثبت شد.");
  };

  const deleteEntry = async (entry: LedgerEntry) => {
    const label = entry.type === "sale" ? "این فروش" : "این هزینه";
    if (!window.confirm(`از حذف ${label} مطمئن هستید؟`)) return;
    try {
      await fetchApi(`/api/venues/${venueId}/ledger/${entry.id}`, { method: "DELETE" });
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setStatus("تراکنش حذف شد.");
    } catch (caught) {
      setStatus(caught instanceof Error ? caught.message : "حذف تراکنش انجام نشد");
    }
  };

  const downloadCsv = () => {
    const currentBounds = getRangeBounds(range, customFrom, customTo);
    if (!currentBounds) return;
    const searchParams = new URLSearchParams();
    if (currentBounds.from) searchParams.set("from", currentBounds.from.toISOString());
    searchParams.set("to", currentBounds.to.toISOString());
    if (entryFilter !== "all") searchParams.set("type", entryFilter);
    window.location.href = `/api/venues/${venueId}/ledger/export-csv?${searchParams.toString()}`;
  };

  return (
    <div className="pb-10">
      <header className="flex flex-col gap-5 border-b border-line/90 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold text-accent">دفتر فروش</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">فروش و هزینه‌ها</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            سفارش‌های تکمیل‌شده و هزینه‌های روزمره را ثبت کنید و جریان نقدی مجموعه را ببینید.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={downloadCsv}>
            <Download className="h-4 w-4 text-accent" strokeWidth={2} />
            خروجی CSV
          </Button>
          <Button variant="secondary" onClick={() => setExpenseOpen(true)}>
            <ArrowDownLeft className="h-4 w-4 text-accent" strokeWidth={2} />
            ثبت هزینه
          </Button>
          <Button onClick={() => setSaleOpen(true)}>
            <Plus className="h-4 w-4" strokeWidth={2} />
            ثبت سفارش
          </Button>
        </div>
      </header>

      <section className="mt-5 rounded-2xl border border-line/90 bg-panel p-2 shadow-[0_1px_2px_rgba(17,17,17,0.03)]">
        <div className="flex gap-1 overflow-x-auto">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
                range === option.key
                  ? "bg-ink text-paper"
                  : "text-ink-muted hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="mt-2 grid gap-2 border-t border-line/70 px-2 pt-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              از
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-ink focus:border-accent/60 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              تا
              <input
                type="date"
                value={customTo}
                min={customFrom}
                onChange={(event) => setCustomTo(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-ink focus:border-accent/60 focus:outline-none"
              />
            </label>
          </div>
        )}
      </section>

      {status && (
        <div
          className="mt-4 rounded-xl border border-line bg-white/55 px-4 py-3 text-xs text-ink-muted"
          role="status"
          aria-live="polite"
        >
          {status}
        </div>
      )}

      <div className={`mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${loading ? "opacity-60" : ""}`}>
        <div className="rounded-2xl border border-line/90 bg-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-muted">فروش</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-success">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-xl font-bold text-ink">{formatMoney(summary.sales)}</p>
          <p className="mt-1 text-[10px] text-ink-muted">تومان · {rangeLabel(range, customFrom, customTo)}</p>
        </div>
        <div className="rounded-2xl border border-line/90 bg-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-muted">هزینه</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-xl font-bold text-ink">{formatMoney(summary.expenses)}</p>
          <p className="mt-1 text-[10px] text-ink-muted">تومان · هزینه‌های ثبت‌شده</p>
        </div>
        <div className="rounded-2xl border border-line/90 bg-ink p-4 text-paper">
          <div className="flex items-center justify-between">
            <p className="text-xs text-paper/60">جریان نقدی خالص</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-paper/10 text-paper">
              <TrendingUp className="h-4 w-4" />
            </span>
          </div>
          <p className={`mt-3 text-xl font-bold ${summary.net < 0 ? "text-red-300" : "text-paper"}`}>
            {summary.net < 0 ? "−" : ""}{formatMoney(Math.abs(summary.net))}
          </p>
          <p className="mt-1 text-[10px] text-paper/50">تومان · فروش منهای هزینه</p>
        </div>
        <div className="rounded-2xl border border-line/90 bg-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-muted">سفارش تکمیل‌شده</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink/5 text-ink">
              <ShoppingBag className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-3 text-xl font-bold text-ink">{summary.orders.toLocaleString("fa-IR")}</p>
          <p className="mt-1 text-[10px] text-ink-muted">
            میانگین {formatMoney(summary.orders ? Math.round(summary.sales / summary.orders) : 0)} تومان
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
        <Panel
          className="min-w-0"
          title="جریان نقدی"
          subtitle="فروش بالای خط و هزینه پایین خط نمایش داده می‌شود."
        >
          {bounds ? (
            <CashflowChart entries={entries} range={range} bounds={bounds} />
          ) : (
            <p className="py-16 text-center text-xs text-ink-muted">یک بازه زمانی معتبر انتخاب کنید.</p>
          )}
        </Panel>

        <Panel title="آیتم‌های پرفروش" subtitle="بر اساس تعداد فروش در بازه انتخاب‌شده">
          {topItems.length ? (
            <div className="space-y-3">
              {topItems.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-xs font-bold text-ink-muted">
                    {(index + 1).toLocaleString("fa-IR")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">{formatMoney(item.revenue)} تومان فروش</p>
                  </div>
                  <span className="text-xs font-bold text-ink">{item.quantity.toLocaleString("fa-IR")} عدد</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <CircleDollarSign className="mx-auto h-7 w-7 text-ink-muted/35" strokeWidth={1.4} />
              <p className="mt-3 text-xs text-ink-muted">هنوز فروشی در این بازه ثبت نشده است.</p>
            </div>
          )}
        </Panel>
      </div>

      <section className="mt-5 overflow-hidden rounded-[var(--radius-panel)] border border-line/90 bg-panel shadow-[0_1px_2px_rgba(17,17,17,0.03)]">
        <div className="flex flex-col gap-3 border-b border-line/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">دفتر تراکنش‌ها</h2>
            <p className="mt-1 text-xs text-ink-muted">
              {visibleEntries.length.toLocaleString("fa-IR")} تراکنش در این نما
            </p>
          </div>
          <label className="relative w-full sm:w-auto">
            <select
              value={entryFilter}
              onChange={(event) => setEntryFilter(event.target.value as EntryFilter)}
              className="w-full appearance-none rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-xs text-ink focus:border-accent/60 focus:outline-none sm:w-36"
            >
              <option value="all">همه تراکنش‌ها</option>
              <option value="sale">فقط فروش</option>
              <option value="expense">فقط هزینه</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
          </label>
        </div>

        {visibleEntries.length ? (
          <div className="divide-y divide-line/70">
            {visibleEntries.map((entry) => (
              <article key={entry.id} className="group flex items-start gap-3 px-4 py-4 sm:px-5">
                <span
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    entry.type === "sale"
                      ? "bg-emerald-50 text-success"
                      : "bg-accent-soft text-accent"
                  }`}
                >
                  {entry.type === "sale" ? (
                    <ReceiptText className="h-4.5 w-4.5" strokeWidth={1.7} />
                  ) : (
                    <WalletCards className="h-4.5 w-4.5" strokeWidth={1.7} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">
                        {entry.type === "sale"
                          ? entry.saleItems
                              .map(
                                (item) =>
                                  `${item.itemName}${item.variantName ? ` (${item.variantName})` : ""} × ${item.quantity.toLocaleString("fa-IR")}`,
                              )
                              .join("، ")
                          : entry.description || "هزینه ثبت‌شده"}
                      </p>
                      {entry.type === "sale" && entry.description && (
                        <p className="mt-1 text-xs text-ink-muted">{entry.description}</p>
                      )}
                    </div>
                    <p
                      className={`shrink-0 text-sm font-bold ${
                        entry.type === "sale" ? "text-success" : "text-accent"
                      }`}
                      dir="ltr"
                    >
                      {entry.type === "sale" ? "+" : "−"} {formatMoney(entry.amountToman)}
                      <span className="ml-1 text-[9px] font-normal text-ink-muted">تومان</span>
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
                      <CalendarDays className="h-3 w-3" />
                      {dateFormatter.format(new Date(entry.occurredAt))} · {timeFormatter.format(new Date(entry.occurredAt))}
                    </span>
                    {entry.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-line px-2 py-0.5 text-[9px] text-ink-muted">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteEntry(entry)}
                  className="shrink-0 rounded-lg p-2 text-ink-muted/45 transition-colors hover:bg-red-50 hover:text-red-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  aria-label="حذف تراکنش"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <ChartNoAxesCombined className="mx-auto h-9 w-9 text-ink-muted/30" strokeWidth={1.3} />
            <h3 className="mt-4 text-sm font-bold text-ink">دفتر هنوز خالی است</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-ink-muted">
              اولین سفارش یا هزینه را ثبت کنید تا خلاصه مالی مجموعه اینجا شکل بگیرد.
            </p>
            <Button className="mt-4" size="sm" onClick={() => setSaleOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              ثبت اولین سفارش
            </Button>
          </div>
        )}
      </section>

      {saleOpen && (
        <SaleModal
          open
          menuItems={menuItems}
          onClose={() => setSaleOpen(false)}
          onSave={createEntry}
        />
      )}
      {expenseOpen && (
        <ExpenseModal
          open
          onClose={() => setExpenseOpen(false)}
          onSave={createEntry}
        />
      )}
    </div>
  );
}

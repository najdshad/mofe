"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toJalaali } from "jalaali-js";
import {
  BarChart3,
  CalendarDays,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  Package,
  Receipt,
  RefreshCw,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type RangeKey = "daily" | "weekly" | "monthly" | "yearly" | "custom";
type TabKey = "overview" | "items" | "hours" | "export";
type SortKey = "revenue" | "quantity";

interface DataPoint {
  date: string;
  persianDate: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

interface Summary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

interface ItemData {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  revenue: number;
  orderCount: number;
  avgPrice: number;
}

interface HourlyData {
  hour: number;
  orders: number;
  items: number;
  revenue: number;
}

interface ItemsSummary {
  totalItemsSold: number;
  totalItemRevenue: number;
  uniqueItems: number;
}

interface SalesResponse {
  venueId: string;
  range: string;
  start: string;
  end: string;
  data: Array<Omit<DataPoint, "persianDate">>;
  summary: Summary;
}

interface ItemsResponse {
  venueId: string;
  range: string;
  start: string;
  end: string;
  items: ItemData[];
  hourly: HourlyData[];
  summary: ItemsSummary;
}

interface DateRange {
  start: string;
  end: string;
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
}

export function toPersianDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const jalaali = toJalaali(year, month, day);
  return `${jalaali.jy}/${String(jalaali.jm).padStart(2, "0")}/${String(jalaali.jd).padStart(2, "0")}`;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("fa-IR");
}

function formatCount(amount: number): string {
  return amount.toLocaleString("fa-IR");
}

function formatCompactNumber(amount: number): string {
  const absoluteAmount = Math.abs(amount);
  const units = [
    { threshold: 1_000_000_000, divisor: 1_000_000_000, label: "میلیارد" },
    { threshold: 1_000_000, divisor: 1_000_000, label: "میلیون" },
    { threshold: 1_000, divisor: 1_000, label: "هزار" },
  ];

  const unit = units.find((entry) => absoluteAmount >= entry.threshold);
  if (!unit) return formatCurrency(amount);

  const value = amount / unit.divisor;
  return `${value.toLocaleString("fa-IR", { maximumFractionDigits: 1 })} ${unit.label}`;
}

function formatDateRange(dateRange: DateRange | null): string {
  if (!dateRange) return "بازه‌ای انتخاب نشده";
  if (dateRange.start === dateRange.end) return toPersianDate(dateRange.start);
  return `${toPersianDate(dateRange.start)} تا ${toPersianDate(dateRange.end)}`;
}

function formatHour(hour: number): string {
  return `${hour.toLocaleString("fa-IR")}:۰۰`;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRelativeDateRange(days: number): DateRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

const INITIAL_SUMMARY: Summary = {
  totalOrders: 0,
  totalRevenue: 0,
  avgOrderValue: 0,
};

const INITIAL_ITEMS_SUMMARY: ItemsSummary = {
  totalItemsSold: 0,
  totalItemRevenue: 0,
  uniqueItems: 0,
};

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; helper: string }> = [
  { key: "daily", label: "روزانه", helper: "۳۰ روز" },
  { key: "weekly", label: "هفتگی", helper: "۱۲ هفته" },
  { key: "monthly", label: "ماهانه", helper: "۱۲ ماه" },
  { key: "yearly", label: "سالانه", helper: "۵ سال" },
  { key: "custom", label: "دلخواه", helper: "انتخاب تاریخ" },
];

const TAB_OPTIONS: Array<{
  key: TabKey;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    key: "overview",
    label: "نمای کلی",
    description: "روند درآمد و سفارش‌ها",
    icon: LayoutDashboard,
  },
  {
    key: "items",
    label: "پرفروش‌ها",
    description: "عملکرد آیتم‌های منو",
    icon: ListOrdered,
  },
  {
    key: "hours",
    label: "ساعات اوج",
    description: "زمان‌های شلوغ مجموعه",
    icon: Clock3,
  },
  {
    key: "export",
    label: "خروجی",
    description: "دانلود گزارش CSV",
    icon: FileText,
  },
];

function SalesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-44 rounded-2xl border border-line bg-paper p-3 text-right shadow-[0_14px_30px_rgba(17,17,17,0.12)]">
      <p className="mb-2 text-xs text-ink-muted">{label}</p>
      {payload.map((entry, index) => {
        const dataKey = String(entry.dataKey ?? entry.name ?? "");
        const value = Number(entry.value ?? 0);
        const isOrders = dataKey === "orders";

        return (
          <div key={`${dataKey}-${index}`} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span className={`h-2 w-2 rounded-full ${isOrders ? "bg-line" : "bg-ink"}`} />
              {isOrders ? "سفارش" : "درآمد"}
            </span>
            <span className="font-medium text-ink-strong">
              {formatCurrency(value)}
              {isOrders ? " سفارش" : " تومان"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-line/60 ${className}`} />;
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-ink-muted">
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </span>
      <h3 className="mt-4 font-serif text-xl text-ink-strong">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-7 text-ink-muted">{description}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  featured = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  featured?: boolean;
}) {
  return (
    <article
      className={`relative overflow-hidden rounded-[var(--radius-panel)] border p-5 transition-transform duration-200 hover:-translate-y-0.5 sm:p-6 ${
        featured
          ? "border-ink bg-ink text-paper shadow-[0_18px_35px_rgba(17,17,17,0.14)]"
          : "border-line bg-paper text-ink shadow-sm"
      }`}
    >
      {featured && (
        <>
          <span className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-paper/10" />
          <span className="absolute -bottom-16 right-8 h-32 w-32 rounded-full border border-paper/10" />
        </>
      )}
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm ${featured ? "text-paper/65" : "text-ink-muted"}`}>{label}</p>
          <p className="mt-3 truncate font-serif text-3xl leading-none sm:text-4xl">{value}</p>
          <p className={`mt-3 text-xs ${featured ? "text-paper/60" : "text-ink-muted"}`}>{detail}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            featured ? "bg-paper/10 text-paper" : "bg-surface text-ink"
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.7} />
        </span>
      </div>
    </article>
  );
}

function FilterDateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-muted">
      <span className="shrink-0">{label}</span>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink focus:ring-2 focus:ring-ink/10"
        dir="ltr"
      />
    </label>
  );
}

export function SalesClient({ venueId }: { venueId: string }) {
  const [range, setRange] = useState<RangeKey>("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedCustomRange, setAppliedCustomRange] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [data, setData] = useState<DataPoint[]>([]);
  const [summary, setSummary] = useState<Summary>(INITIAL_SUMMARY);
  const [itemsData, setItemsData] = useState<ItemData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [itemsSummary, setItemsSummary] = useState<ItemsSummary>(INITIAL_ITEMS_SUMMARY);
  const [sortBy, setSortBy] = useState<SortKey>("revenue");
  const [period, setPeriod] = useState<DateRange | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportType, setExportType] = useState<"overview" | "items">("overview");

  const fetchSalesData = useCallback(
    async (selectedRange: RangeKey, start?: string, end?: string) => {
      const params = new URLSearchParams({ range: selectedRange });
      if (start) params.set("start", start);
      if (end) params.set("end", end);

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/venues/${venueId}/sales?${params.toString()}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "دریافت گزارش فروش ناموفق بود");
        }

        const json = (await response.json()) as SalesResponse;
        setData(
          json.data.map((point) => ({
            ...point,
            persianDate: toPersianDate(point.date),
          })),
        );
        setSummary(json.summary);
        setPeriod({ start: json.start, end: json.end });
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "دریافت گزارش فروش ناموفق بود");
      } finally {
        setLoading(false);
      }
    },
    [venueId],
  );

  const fetchItemsData = useCallback(
    async (selectedRange: RangeKey, selectedSort: SortKey, start?: string, end?: string) => {
      const params = new URLSearchParams({
        range: selectedRange,
        sortBy: selectedSort,
        limit: "20",
      });
      if (start) params.set("start", start);
      if (end) params.set("end", end);

      setItemsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/venues/${venueId}/sales/items?${params.toString()}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "دریافت جزئیات فروش ناموفق بود");
        }

        const json = (await response.json()) as ItemsResponse;
        setItemsData(json.items);
        setHourlyData(json.hourly);
        setItemsSummary(json.summary);
        setPeriod({ start: json.start, end: json.end });
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "دریافت جزئیات فروش ناموفق بود");
      } finally {
        setItemsLoading(false);
      }
    },
    [venueId],
  );

  useEffect(() => {
    if (range === "custom") {
      if (activeTab !== "overview" || !appliedCustomRange) return;
      const requestId = setTimeout(() => {
        void fetchSalesData("custom", appliedCustomRange.start, appliedCustomRange.end);
      }, 0);
      return () => clearTimeout(requestId);
    }

    const requestId = setTimeout(() => {
      void fetchSalesData(range);
    }, 0);
    return () => clearTimeout(requestId);
  }, [activeTab, appliedCustomRange, fetchSalesData, range]);

  useEffect(() => {
    if (activeTab !== "items" && activeTab !== "hours") return;

    if (range === "custom") {
      if (!appliedCustomRange) return;
      const requestId = setTimeout(() => {
        void fetchItemsData(range, sortBy, appliedCustomRange.start, appliedCustomRange.end);
      }, 0);
      return () => clearTimeout(requestId);
    }

    const requestId = setTimeout(() => {
      void fetchItemsData(range, sortBy);
    }, 0);
    return () => clearTimeout(requestId);
  }, [activeTab, appliedCustomRange, fetchItemsData, range, sortBy]);

  const handleRangeChange = (nextRange: RangeKey) => {
    setRange(nextRange);
    setError(null);
    setExportSuccess(false);

    if (nextRange === "custom") {
      setLoading(false);
      setData([]);
      setSummary(INITIAL_SUMMARY);
      setPeriod(null);
      setAppliedCustomRange(null);
      setItemsData([]);
      setHourlyData([]);
      setItemsSummary(INITIAL_ITEMS_SUMMARY);
    }

    if (nextRange === "custom" && (!startDate || !endDate)) {
      const suggestedRange = getRelativeDateRange(30);
      setStartDate(suggestedRange.start);
      setEndDate(suggestedRange.end);
    }
  };

  const handleCustomSubmit = () => {
    if (!startDate || !endDate) {
      setError("لطفاً تاریخ شروع و پایان را انتخاب کنید.");
      return;
    }
    if (startDate > endDate) {
      setError("تاریخ شروع باید قبل از تاریخ پایان باشد.");
      return;
    }

    const nextRange = { start: startDate, end: endDate };
    setAppliedCustomRange(nextRange);
    setError(null);
  };

  const handleRefresh = () => {
    setExportSuccess(false);
    if (range === "custom") {
      if (!appliedCustomRange) {
        setError("ابتدا بازه دلخواه را اعمال کنید.");
        return;
      }

      if (activeTab === "overview") {
        void fetchSalesData("custom", appliedCustomRange.start, appliedCustomRange.end);
      } else if (activeTab === "items" || activeTab === "hours") {
        void fetchItemsData("custom", sortBy, appliedCustomRange.start, appliedCustomRange.end);
      }
      return;
    }

    if (activeTab === "overview" || activeTab === "export") {
      void fetchSalesData(range);
    } else {
      void fetchItemsData(range, sortBy);
    }
  };

  const handleDownload = async () => {
    if (!startDate || !endDate) {
      setError("برای ساخت خروجی، تاریخ شروع و پایان را انتخاب کنید.");
      return;
    }
    if (startDate > endDate) {
      setError("تاریخ شروع باید قبل از تاریخ پایان باشد.");
      return;
    }

    setExportLoading(true);
    setExportSuccess(false);
    setError(null);

    try {
      const params = new URLSearchParams({
        range: "custom",
        type: exportType,
        start: startDate,
        end: endDate,
      });
      const response = await fetch(`/api/venues/${venueId}/sales/export?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "ساخت خروجی ناموفق بود");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `sales-export-${startDate}-${endDate}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      setExportSuccess(true);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "ساخت خروجی ناموفق بود");
    } finally {
      setExportLoading(false);
    }
  };

  const setQuickExportRange = (days: number) => {
    const quickRange = getRelativeDateRange(days);
    setStartDate(quickRange.start);
    setEndDate(quickRange.end);
    setExportSuccess(false);
    setError(null);
  };

  const highestRevenuePoint = useMemo(
    () => data.reduce<DataPoint | null>((highest, point) => (highest && highest.revenue >= point.revenue ? highest : point), null),
    [data],
  );
  const topItem = itemsData[0] ?? null;
  const maxItemMetric = useMemo(
    () =>
      Math.max(
        ...itemsData.map((item) => (sortBy === "revenue" ? item.revenue : item.quantity)),
        1,
      ),
    [itemsData, sortBy],
  );
  const peakHour = useMemo(
    () => hourlyData.reduce<HourlyData | null>((peak, hour) => (peak && peak.revenue >= hour.revenue ? peak : hour), null),
    [hourlyData],
  );
  const maxHourlyRevenue = useMemo(
    () => Math.max(...hourlyData.map((hour) => hour.revenue), 1),
    [hourlyData],
  );
  const customRangeReady = range !== "custom" || appliedCustomRange !== null;
  const activeTabOption = TAB_OPTIONS.find((option) => option.key === activeTab) ?? TAB_OPTIONS[0];

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="درآمد کل"
          value={formatCompactNumber(summary.totalRevenue)}
          detail={`${formatCurrency(summary.totalRevenue)} تومان`}
          icon={TrendingUp}
          featured
        />
        <StatCard
          label="سفارش‌های تکمیل‌شده"
          value={formatCount(summary.totalOrders)}
          detail={`${data.length ? formatCount(data.length) : "۰"} بازه ثبت‌شده`}
          icon={Receipt}
        />
        <StatCard
          label="میانگین ارزش سفارش"
          value={formatCompactNumber(summary.avgOrderValue)}
          detail={`${formatCurrency(summary.avgOrderValue)} تومان برای هر سفارش`}
          icon={BarChart3}
        />
      </div>

      <section className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted">روند عملکرد</p>
            <h2 className="mt-1 font-serif text-2xl text-ink-strong">درآمد در طول زمان</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink" />
              درآمد
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-line" />
              سفارش‌ها
            </span>
            {highestRevenuePoint && (
              <span className="rounded-full bg-surface px-3 py-1.5">
                بهترین روز: {highestRevenuePoint.persianDate}
              </span>
            )}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div className="space-y-4 px-5 py-8 sm:px-6">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-64 w-full rounded-2xl" />
          </div>
        ) : !customRangeReady ? (
          <EmptyState
            icon={CalendarDays}
            title="بازه دلخواه را مشخص کنید"
            description="تاریخ شروع و پایان را انتخاب کنید تا گزارش دقیق همان بازه نمایش داده شود."
          />
        ) : data.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="هنوز فروشی ثبت نشده"
            description="با تکمیل اولین سفارش، روند درآمد و سفارش‌ها اینجا نمایش داده می‌شود."
          />
        ) : (
          <div className="relative px-3 pb-5 pt-6 sm:px-6 sm:pb-7">
            {loading && (
              <div className="absolute left-6 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-3 py-1.5 text-xs text-ink-muted shadow-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                در حال بروزرسانی
              </div>
            )}
            <div className="h-[290px] w-full sm:h-[330px]" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 12, right: 4, left: 2, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111111" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="#111111" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#d8d1c4" strokeDasharray="4 5" />
                  <XAxis
                    dataKey="persianDate"
                    tick={{ fontSize: 10, fill: "#5f5a52" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#5f5a52" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => formatCompactNumber(value)}
                    width={58}
                  />
                  <Tooltip content={<SalesTooltip />} cursor={{ stroke: "#d8d1c4", strokeDasharray: "4 4" }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="درآمد"
                    stroke="#111111"
                    strokeWidth={2.5}
                    fill="url(#salesRevenueFill)"
                    activeDot={{ r: 5, fill: "#111111", stroke: "#f5f0e6", strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {!loading && data.length > 0 && (
        <section className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted">جزئیات بازه</p>
              <h2 className="mt-1 font-serif text-xl text-ink-strong">آخرین ثبت‌ها</h2>
            </div>
            <span className="rounded-full bg-surface px-3 py-1.5 text-xs text-ink-muted">{formatDateRange(period)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-right text-sm">
              <thead className="bg-surface/60 text-xs text-ink-muted">
                <tr>
                  <th className="px-5 py-3 font-normal sm:px-6">تاریخ</th>
                  <th className="px-5 py-3 font-normal sm:px-6">سفارش</th>
                  <th className="px-5 py-3 font-normal sm:px-6">درآمد</th>
                  <th className="px-5 py-3 font-normal sm:px-6">میانگین سفارش</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data
                  .slice()
                  .reverse()
                  .map((point) => (
                    <tr key={point.date} className="transition-colors hover:bg-surface/60">
                      <td className="px-5 py-3.5 text-ink sm:px-6" dir="ltr">
                        {point.persianDate}
                      </td>
                      <td className="px-5 py-3.5 text-ink sm:px-6" dir="ltr">
                        {formatCount(point.orders)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-ink-strong sm:px-6" dir="ltr">
                        {formatCurrency(point.revenue)} تومان
                      </td>
                      <td className="px-5 py-3.5 text-ink-muted sm:px-6" dir="ltr">
                        {formatCurrency(point.avgOrderValue)} تومان
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );

  const renderItems = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="آیتم فروخته‌شده"
          value={formatCount(itemsSummary.totalItemsSold)}
          detail="تعداد کل در سفارش‌های تکمیل‌شده"
          icon={Package}
        />
        <StatCard
          label="آیتم‌های فعال در گزارش"
          value={formatCount(itemsSummary.uniqueItems)}
          detail="آیتم با حداقل یک فروش"
          icon={ListOrdered}
        />
        <StatCard
          label="درآمد آیتم‌ها"
          value={formatCompactNumber(itemsSummary.totalItemRevenue)}
          detail={`${formatCurrency(itemsSummary.totalItemRevenue)} تومان`}
          icon={TrendingUp}
          featured
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <section className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-paper shadow-sm">
          <div className="flex flex-col gap-3 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted">منوی شما</p>
              <h2 className="mt-1 font-serif text-2xl text-ink-strong">پرفروش‌ترین آیتم‌ها</h2>
            </div>
            <div className="flex w-fit rounded-xl border border-line bg-surface p-1 text-xs">
              <button
                type="button"
                onClick={() => setSortBy("revenue")}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  sortBy === "revenue" ? "bg-ink text-paper shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                درآمد
              </button>
              <button
                type="button"
                onClick={() => setSortBy("quantity")}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  sortBy === "quantity" ? "bg-ink text-paper shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                تعداد
              </button>
            </div>
          </div>

          {itemsLoading ? (
            <div className="space-y-4 px-5 py-6 sm:px-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <SkeletonBlock className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-4 w-2/5" />
                    <SkeletonBlock className="h-2 w-full" />
                  </div>
                  <SkeletonBlock className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !customRangeReady ? (
            <EmptyState
              icon={CalendarDays}
              title="بازه دلخواه را اعمال کنید"
              description="برای دیدن رتبه‌بندی آیتم‌ها، ابتدا تاریخ‌ها را انتخاب و اعمال کنید."
            />
          ) : itemsData.length === 0 ? (
            <EmptyState
              icon={Package}
              title="آیتمی برای نمایش نیست"
              description="در این بازه هنوز فروش آیتمی ثبت نشده است."
            />
          ) : (
            <div className="divide-y divide-line">
              {itemsData.map((item, index) => {
                const metric = sortBy === "revenue" ? item.revenue : item.quantity;
                const percentage = Math.max(7, Math.round((metric / maxItemMetric) * 100));

                return (
                  <div key={item.menuItemId} className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-medium ${
                        index === 0 ? "bg-ink text-paper" : "bg-surface text-ink-muted"
                      }`}
                    >
                      {formatCount(index + 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-ink-strong">{item.menuItemName}</p>
                        <p className="shrink-0 text-xs text-ink-muted">
                          {sortBy === "revenue" ? `${formatCompactNumber(item.revenue)} تومان` : `${formatCount(item.quantity)} عدد`}
                        </p>
                      </div>
                      <div className="mt-2 flex justify-end overflow-hidden rounded-full bg-line/60">
                        <div
                          className="h-2 rounded-full bg-ink transition-[width] duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-muted">
                        <span>{formatCount(item.quantity)} عدد فروخته‌شده</span>
                        <span className="h-1 w-1 rounded-full bg-line" />
                        <span>{formatCount(item.orderCount)} سفارش</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="relative overflow-hidden rounded-[var(--radius-panel)] bg-ink p-5 text-paper shadow-[0_18px_35px_rgba(17,17,17,0.14)] sm:p-6">
            <span className="absolute -left-10 -top-10 h-32 w-32 rounded-full border border-paper/10" />
            <span className="absolute -bottom-20 right-4 h-40 w-40 rounded-full bg-paper/5" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-paper/70">تمرکز این بازه</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper/10">
                  <Sparkles className="h-4 w-4" strokeWidth={1.7} />
                </span>
              </div>
              {topItem ? (
                <>
                  <p className="mt-8 text-xs text-paper/55">پرفروش‌ترین انتخاب مشتری‌ها</p>
                  <h3 className="mt-2 truncate font-serif text-2xl">{topItem.menuItemName}</h3>
                  <p className="mt-2 text-sm text-paper/70">
                    {formatCount(topItem.quantity)} عدد · {formatCompactNumber(topItem.revenue)} تومان
                  </p>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-paper/15">
                    <div
                      className="h-full rounded-full bg-paper"
                      style={{
                        width: `${itemsSummary.totalItemRevenue ? Math.min(100, Math.round((topItem.revenue / itemsSummary.totalItemRevenue) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-paper/55">
                    سهم از درآمد آیتم‌های نمایش‌داده‌شده
                  </p>
                </>
              ) : (
                <p className="mt-8 text-sm leading-7 text-paper/65">پس از ثبت فروش، مهم‌ترین آیتم‌های منو اینجا ظاهر می‌شوند.</p>
              )}
            </div>
          </section>

          <section className="rounded-[var(--radius-panel)] border border-line bg-paper p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-ink">
                <BarChart3 className="h-4 w-4" strokeWidth={1.7} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-strong">نکته سریع</p>
                <p className="text-xs text-ink-muted">برای تصمیم‌گیری بهتر</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink-muted">
              با مقایسه «درآمد» و «تعداد»، آیتم‌هایی را پیدا کنید که فروش زیادی دارند یا حاشیه درآمدی بالاتری می‌سازند.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );

  const renderHours = () => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="شلوغ‌ترین ساعت"
          value={peakHour ? formatHour(peakHour.hour) : "—"}
          detail={peakHour ? `${formatCount(peakHour.orders)} سفارش در این ساعت` : "داده‌ای برای تحلیل نیست"}
          icon={Clock3}
          featured
        />
        <StatCard
          label="آیتم‌های فروخته‌شده"
          value={formatCount(itemsSummary.totalItemsSold)}
          detail="مجموع آیتم‌های ثبت‌شده در بازه"
          icon={Package}
        />
        <StatCard
          label="درآمد ساعت اوج"
          value={peakHour ? formatCompactNumber(peakHour.revenue) : "۰"}
          detail={peakHour ? `${formatCurrency(peakHour.revenue)} تومان` : "—"}
          icon={TrendingUp}
        />
      </div>

      <section className="rounded-[var(--radius-panel)] border border-line bg-paper shadow-sm">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted">الگوی روزانه</p>
          <h2 className="mt-1 font-serif text-2xl text-ink-strong">چه زمانی شلوغ‌تر هستید؟</h2>
          <p className="mt-2 text-sm text-ink-muted">ساعت‌ها بر اساس درآمد مرتب نشده‌اند تا ریتم واقعی روزتان مشخص باشد.</p>
        </div>

        {itemsLoading ? (
          <div className="space-y-5 px-5 py-7 sm:px-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[42px_minmax(0,1fr)_72px] items-center gap-3">
                <SkeletonBlock className="h-4 w-10" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : !customRangeReady ? (
          <EmptyState
            icon={CalendarDays}
            title="بازه دلخواه را اعمال کنید"
            description="برای تحلیل ساعات شلوغ، ابتدا تاریخ‌ها را انتخاب و اعمال کنید."
          />
        ) : hourlyData.length === 0 ? (
          <EmptyState
            icon={Clock3}
            title="داده‌ای برای تحلیل نیست"
            description="با ثبت سفارش‌های بیشتر، ساعات اوج مجموعه را بهتر بشناسید."
          />
        ) : (
          <div className="space-y-4 px-5 py-6 sm:px-6">
            {hourlyData.map((hour) => {
              const percentage = Math.max(4, Math.round((hour.revenue / maxHourlyRevenue) * 100));
              const isPeak = peakHour?.hour === hour.hour;

              return (
                <div key={hour.hour} className="grid grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[52px_minmax(0,1fr)_110px] sm:gap-4">
                  <span className={`text-xs font-medium ${isPeak ? "text-ink-strong" : "text-ink-muted"}`} dir="ltr">
                    {formatHour(hour.hour)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex justify-end overflow-hidden rounded-full bg-line/60">
                      <div
                        className={`h-3 rounded-full transition-[width] duration-300 ${isPeak ? "bg-ink" : "bg-ink/55"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-muted">
                      <span>{formatCount(hour.orders)} سفارش</span>
                      <span className="h-1 w-1 rounded-full bg-line" />
                      <span>{formatCount(hour.items)} آیتم</span>
                    </div>
                  </div>
                  <span className={`text-left text-xs ${isPeak ? "font-medium text-ink-strong" : "text-ink-muted"}`} dir="ltr">
                    {formatCompactNumber(hour.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );

  const renderExport = () => (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <section className="rounded-[var(--radius-panel)] border border-line bg-paper p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted">گزارش قابل استفاده</p>
            <h2 className="mt-1 font-serif text-2xl text-ink-strong">خروجی فروش بسازید</h2>
            <p className="mt-2 text-sm leading-7 text-ink-muted">
              گزارش را برای حسابداری، بررسی عملکرد یا برنامه‌ریزی منوی آینده دانلود کنید.
            </p>
          </div>
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink sm:flex">
            <Download className="h-5 w-5" strokeWidth={1.7} />
          </span>
        </div>

        <form
          className="mt-7 space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            void handleDownload();
          }}
        >
          <div>
            <p className="mb-3 text-sm font-medium text-ink-strong">بازه زمانی</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FilterDateField id="export-start-date" label="از" value={startDate} onChange={setStartDate} />
              <FilterDateField id="export-end-date" label="تا" value={endDate} onChange={setEndDate} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQuickExportRange(30)}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                ۳۰ روز اخیر
              </button>
              <button
                type="button"
                onClick={() => setQuickExportRange(90)}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                ۳ ماه اخیر
              </button>
              <button
                type="button"
                onClick={() => setQuickExportRange(365)}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
              >
                سال اخیر
              </button>
            </div>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-medium text-ink-strong">نوع گزارش</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setExportType("overview")}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-right transition-all ${
                  exportType === "overview"
                    ? "border-ink bg-ink/5 shadow-[0_0_0_1px_rgba(17,17,17,0.05)]"
                    : "border-line bg-surface/50 hover:border-ink/50"
                }`}
                aria-pressed={exportType === "overview"}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-ink">
                  <BarChart3 className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink-strong">خلاصه فروش</span>
                  <span className="mt-1 block text-xs leading-5 text-ink-muted">تاریخ، سفارش، درآمد و میانگین</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setExportType("items")}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-right transition-all ${
                  exportType === "items"
                    ? "border-ink bg-ink/5 shadow-[0_0_0_1px_rgba(17,17,17,0.05)]"
                    : "border-line bg-surface/50 hover:border-ink/50"
                }`}
                aria-pressed={exportType === "items"}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper text-ink">
                  <Package className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-ink-strong">جزئیات آیتم‌ها</span>
                  <span className="mt-1 block text-xs leading-5 text-ink-muted">اقلام، تعداد، قیمت و ایستگاه</span>
                </span>
              </button>
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" size="lg" disabled={!startDate || !endDate || exportLoading}>
              {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exportLoading ? "در حال آماده‌سازی..." : "دانلود فایل CSV"}
            </Button>
            {exportSuccess && (
              <span className="text-xs text-emerald-700" role="status">
                فایل با موفقیت آماده شد.
              </span>
            )}
          </div>
        </form>
      </section>

      <aside className="relative overflow-hidden rounded-[var(--radius-panel)] bg-ink p-6 text-paper shadow-[0_18px_35px_rgba(17,17,17,0.14)] sm:p-7">
        <span className="absolute -left-12 -top-12 h-36 w-36 rounded-full border border-paper/10" />
        <span className="absolute -bottom-16 right-0 h-44 w-44 rounded-full bg-paper/5" />
        <div className="relative">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper/10">
            <FileText className="h-5 w-5" strokeWidth={1.7} />
          </span>
          <h3 className="mt-7 font-serif text-2xl">گزارشی که آماده تصمیم‌گیری است</h3>
          <p className="mt-3 text-sm leading-8 text-paper/65">
            فایل‌های CSV با اعداد فارسی و ساختار مرتب آماده می‌شوند تا بتوانید آن‌ها را در اکسل یا ابزار حسابداری خود باز کنید.
          </p>
          <div className="mt-8 space-y-3 text-sm text-paper/75">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
              سازگار با اکسل و گوگل شیت
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
              مناسب برای بایگانی ماهانه
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-paper" />
              بدون تغییر در داده‌های فروش
            </div>
          </div>
        </div>
      </aside>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-12 sm:space-y-5">
      <header className="relative overflow-hidden rounded-[var(--radius-panel)] bg-ink px-5 py-6 text-paper shadow-[0_18px_35px_rgba(17,17,17,0.14)] sm:px-8 sm:py-8">
        <span className="absolute -left-12 -top-16 h-40 w-40 rounded-full border border-paper/10" />
        <span className="absolute bottom-[-5rem] right-[12%] h-48 w-48 rounded-full bg-paper/5" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-paper/60">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.7} />
              <span className="tracking-[0.12em]">گزارش عملکرد مجموعه</span>
            </div>
            <h1 className="mt-3 max-w-xl font-serif text-3xl leading-tight sm:text-4xl">فروش را با یک نگاه مدیریت کنید</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-paper/65">
              روند درآمد، رفتار مشتری‌ها و آیتم‌های محبوب منو را سریع‌تر از همیشه پیدا کنید.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-paper/15 bg-paper/10 px-3 py-2 text-xs text-paper/80">
                <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.7} />
                {period ? formatDateRange(period) : "در حال دریافت بازه"}
              </span>
              {loading || itemsLoading ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-3 py-2 text-xs text-paper/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  بروزرسانی داده‌ها
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-paper/15 px-3 py-2 text-xs text-paper/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  آخرین داده‌های ثبت‌شده
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-paper/20 bg-paper/10 px-4 py-2.5 text-sm text-paper transition-colors hover:bg-paper/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40"
          >
            <RefreshCw className={`h-4 w-4 ${loading || itemsLoading ? "animate-spin" : ""}`} strokeWidth={1.7} />
            بروزرسانی
          </button>
        </div>
      </header>

      <nav
        aria-label="بخش‌های گزارش فروش"
        className="rounded-[var(--radius-panel)] border border-line bg-paper p-2 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex min-w-0 items-center gap-2.5 rounded-2xl px-3 py-3 text-right transition-all sm:gap-3 sm:px-4 ${
                  isActive ? "bg-ink text-paper shadow-sm" : "text-ink-muted hover:bg-surface hover:text-ink"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-paper/10" : "bg-surface"}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{tab.label}</span>
                  <span className={`mt-0.5 hidden truncate text-[11px] sm:block ${isActive ? "text-paper/60" : "text-ink-muted/70"}`}>
                    {tab.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {activeTab !== "export" && (
        <section className="rounded-[var(--radius-panel)] border border-line bg-paper p-2 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs text-ink-muted">
              <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={1.7} />
              <span className="shrink-0">بازه گزارش</span>
              <span className="truncate rounded-full bg-surface px-2.5 py-1 text-ink">{formatDateRange(period)}</span>
            </div>
            <div className="flex min-w-0 gap-1 overflow-x-auto pb-0.5">
              {RANGE_OPTIONS.map((option) => {
                const isActive = range === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleRangeChange(option.key)}
                    className={`shrink-0 rounded-xl px-3 py-2 text-right transition-all ${
                      isActive ? "bg-ink text-paper shadow-sm" : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    <span className="block text-xs font-medium">{option.label}</span>
                    <span className={`mt-0.5 block text-[10px] ${isActive ? "text-paper/60" : "text-ink-muted/70"}`}>
                      {option.helper}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {range === "custom" && (
            <div className="mt-2 flex flex-col gap-2 border-t border-line px-3 pb-2 pt-3 sm:flex-row sm:items-end">
              <FilterDateField id="sales-start-date" label="از" value={startDate} onChange={setStartDate} />
              <FilterDateField id="sales-end-date" label="تا" value={endDate} onChange={setEndDate} />
              <Button type="button" size="sm" onClick={handleCustomSubmit} disabled={!startDate || !endDate}>
                نمایش گزارش
              </Button>
            </div>
          )}
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            {error}
          </span>
          <button type="button" onClick={handleRefresh} className="w-fit text-xs font-medium underline underline-offset-4">
            تلاش دوباره
          </button>
        </div>
      )}

      <div aria-live="polite">
        {activeTab === "overview" && renderOverview()}
        {activeTab === "items" && renderItems()}
        {activeTab === "hours" && renderHours()}
        {activeTab === "export" && renderExport()}
      </div>

      <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-line" />
        {activeTabOption.description}
      </p>
    </div>
  );
}

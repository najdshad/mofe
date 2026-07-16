"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toJalaali } from "jalaali-js";

type RangeKey = "daily" | "weekly" | "monthly" | "yearly" | "custom";
type TabKey = "overview" | "items" | "hours" | "export";

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
  data: DataPoint[];
  summary: Summary;
}

interface ItemsResponse {
  items: ItemData[];
  hourly: HourlyData[];
  summary: ItemsSummary;
}

export function toPersianDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const j = toJalaali(y, m, d);
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("fa-IR");
}

const RANGE_LABELS: Record<RangeKey, string> = {
  daily: "روز",
  weekly: "هفته",
  monthly: "ماه",
  yearly: "سال",
  custom: "دلخواه",
};

const RANGE_KEYS: RangeKey[] = ["daily", "weekly", "monthly", "yearly", "custom"];

const TAB_LABELS: Record<TabKey, string> = {
  overview: "نمای کلی",
  items: "آیتم‌ها",
  hours: "ساعات",
  export: "خروجی",
};

const TAB_KEYS: TabKey[] = ["overview", "items", "hours", "export"];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload || !label) return null;
  return (
    <div className="rounded-xl border border-line bg-paper p-3 shadow-lg">
      <p className="mb-1 text-xs text-ink-muted">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm text-ink-strong">
          {entry.name}: {formatCurrency(entry.value)} تومان
        </p>
      ))}
    </div>
  );
}

function ItemsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload || !label) return null;
  return (
    <div className="rounded-xl border border-line bg-paper p-3 shadow-lg">
      <p className="mb-1 text-xs text-ink-muted">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm text-ink-strong">
          {entry.name}: {(entry.value / 1_000_000).toFixed(1)}M تومان
        </p>
      ))}
    </div>
  );
}

export function SalesClient({ venueId }: { venueId: string }) {
  const [range, setRange] = useState<RangeKey>("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [data, setData] = useState<DataPoint[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });

  const [itemsData, setItemsData] = useState<ItemData[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [itemsSummary, setItemsSummary] = useState<ItemsSummary>({
    totalItemsSold: 0,
    totalItemRevenue: 0,
    uniqueItems: 0,
  });
  const [sortBy, setSortBy] = useState<"revenue" | "quantity">("revenue");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportType, setExportType] = useState<"overview" | "items">("overview");

  const doFetch = useCallback(
    (r: RangeKey, start?: string, end?: string) => {
      const params = new URLSearchParams({ range: r });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      fetch(`/api/venues/${venueId}/sales?${params}`)
        .then((res) => {
          if (!res.ok)
            return res.json().then((b) => Promise.reject(new Error(b?.error || "Failed to fetch sales data")));
          return res.json();
        })
        .then((json: SalesResponse) => {
          setData(json.data.map((d) => ({ ...d, persianDate: toPersianDate(d.date) })));
          setSummary(json.summary);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Unknown error");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [venueId],
  );

  const fetchItemsData = useCallback(
    (r: RangeKey, sort: string, start?: string, end?: string) => {
      const params = new URLSearchParams({ range: r, sortBy: sort, limit: "20" });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      fetch(`/api/venues/${venueId}/sales/items?${params}`)
        .then((res) => {
          if (!res.ok)
            return res.json().then((b) => Promise.reject(new Error(b?.error || "Failed to fetch items data")));
          return res.json();
        })
        .then((json: ItemsResponse) => {
          setItemsData(json.items);
          setHourlyData(json.hourly);
          setItemsSummary(json.summary);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Unknown error");
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [venueId],
  );

  useEffect(() => {
    if (range === "custom") return;
    const id = setTimeout(() => {
      setLoading(true);
      setError(null);
      doFetch(range);
    }, 0);
    return () => clearTimeout(id);
  }, [range, doFetch]);

  useEffect(() => {
    if (!(activeTab === "items" || activeTab === "hours")) return;
    if (range === "custom") return;
    const id = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetchItemsData(range, sortBy);
    }, 0);
    return () => clearTimeout(id);
  }, [activeTab, range, sortBy, fetchItemsData]);

  const handleCustomSubmit = () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    if (activeTab === "items" || activeTab === "hours") {
      fetchItemsData("custom", sortBy, startDate, endDate);
    } else if (activeTab === "overview") {
      doFetch("custom", startDate, endDate);
    }
  };

  const handleDownload = async () => {
    setExportLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ range: "custom", type: exportType });
      params.set("start", startDate);
      params.set("end", endDate);
      const res = await fetch(`/api/venues/${venueId}/sales/export?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${startDate || range}-${endDate || ""}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  const top10 = itemsData.slice(0, 10).reverse();

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-ink-strong">گزارش فروش</h1>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-line">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={
              `border-b-2 px-3 py-2 text-sm transition-colors ` +
              (activeTab === key
                ? "border-ink text-ink-strong"
                : "border-transparent text-ink-muted hover:border-ink hover:text-ink")
            }
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Range tabs */}
      {activeTab !== "export" && (
        <div className="flex items-center gap-1 border-b border-line">
          {RANGE_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={
                `border-b-2 px-3 py-2 text-sm transition-colors ` +
                (range === key
                  ? "border-ink text-ink-strong"
                  : "border-transparent text-ink-muted hover:border-ink hover:text-ink")
              }
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      )}

      {/* Custom date picker */}
      {activeTab !== "export" && range === "custom" && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            از
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-muted">
            تا
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-ink"
            />
          </label>
          <button
            onClick={handleCustomSubmit}
            disabled={!startDate || !endDate}
            className="rounded-lg border border-line bg-surface px-3 py-1 text-sm text-ink transition-colors hover:bg-line disabled:opacity-50"
          >
            نمایش
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ============ TAB 1: OVERVIEW ============ */}
      {activeTab === "overview" && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 text-center">
              <div className="mx-auto max-w-full truncate font-serif text-xl text-ink-strong">
                {formatCurrency(summary.totalOrders)}
              </div>
              <div className="mt-1 text-xs text-ink-muted">سفارش</div>
            </div>
            <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 text-center">
              <div className="mx-auto max-w-full truncate font-serif text-xl text-ink-strong">
                {formatCurrency(summary.totalRevenue)}
              </div>
              <div className="mt-1 text-xs text-ink-muted">درآمد (تومان)</div>
            </div>
            <div className="min-w-0 rounded-2xl border border-line bg-surface p-4 text-center">
              <div className="mx-auto max-w-full truncate font-serif text-xl text-ink-strong">
                {formatCurrency(summary.avgOrderValue)}
              </div>
              <div className="mt-1 text-xs text-ink-muted">میانگین هر سفارش</div>
            </div>
          </div>

          {/* Loading / Empty */}
          {loading && <div className="py-12 text-center text-sm text-ink-muted">در حال بارگذاری...</div>}
          {!loading && !error && data.length === 0 && (
            <div className="py-12 text-center text-sm text-ink-muted">داده‌ای برای نمایش وجود ندارد</div>
          )}

          {/* Chart */}
          {!loading && !error && data.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-4" style={{ overflow: "visible" }}>
              <style>{`.sales-chart svg { overflow: visible !important; }`}</style>
              <ResponsiveContainer width="100%" height={320} className="sales-chart">
                <BarChart data={data} margin={{ top: 8, right: 32, left: 32, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d8d1c4" />
                  <XAxis
                    dataKey="persianDate"
                    tick={{ fontSize: 10, fill: "#5f5a52" }}
                    axisLine={{ stroke: "#d8d1c4" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#5f5a52", dx: -4 }}
                    axisLine={{ stroke: "#d8d1c4" }}
                    tickLine={false}
                    tickFormatter={(v: number) => (v / 1_000_000).toFixed(1) + "M"}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#111111" radius={[4, 4, 0, 0]} name="درآمد" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data table */}
          {!loading && data.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-ink-muted font-normal">تاریخ</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">تعداد سفارش</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">درآمد</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">میانگین</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.map((point) => (
                    <tr key={point.date} className="hover:bg-surface/50">
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {point.persianDate}
                      </td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {point.orders.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {formatCurrency(point.revenue)}
                      </td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {formatCurrency(point.avgOrderValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============ TAB 2: ITEMS ============ */}
      {activeTab === "items" && (
        <>
          {/* Summary row */}
          {!loading && itemsData.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-4 text-center text-sm text-ink-muted">
              {itemsSummary.uniqueItems.toLocaleString("fa-IR")} آیتم مختلف فروخته شد |{" "}
              {itemsSummary.totalItemsSold.toLocaleString("fa-IR")} عدد آیتم |{" "}
              {formatCurrency(itemsSummary.totalItemRevenue)} تومان درآمد
            </div>
          )}

          {/* Sort toggle */}
          {!loading && itemsData.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-muted">مرتب‌سازی:</span>
              <button
                onClick={() => setSortBy("revenue")}
                className={
                  `rounded-lg border px-3 py-1 text-xs transition-colors ` +
                  (sortBy === "revenue"
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface text-ink hover:bg-line")
                }
              >
                بر اساس درآمد
              </button>
              <button
                onClick={() => setSortBy("quantity")}
                className={
                  `rounded-lg border px-3 py-1 text-xs transition-colors ` +
                  (sortBy === "quantity"
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface text-ink hover:bg-line")
                }
              >
                بر اساس تعداد
              </button>
            </div>
          )}

          {loading && <div className="py-12 text-center text-sm text-ink-muted">در حال بارگذاری...</div>}
          {!loading && !error && itemsData.length === 0 && (
            <div className="py-12 text-center text-sm text-ink-muted">داده‌ای برای نمایش وجود ندارد</div>
          )}

          {/* Horizontal bar chart */}
          {!loading && !error && top10.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-4" style={{ overflow: "visible" }}>
              <style>{`.items-chart svg { overflow: visible !important; }`}</style>
              <ResponsiveContainer width="100%" height={400} className="items-chart">
                <BarChart data={top10} layout="vertical" margin={{ left: 100, right: 24, top: 8, bottom: 8 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#5f5a52" }}
                    axisLine={{ stroke: "#d8d1c4" }}
                    tickLine={false}
                    tickFormatter={(v: number) => (v / 1_000_000).toFixed(1) + "M"}
                  />
                  <YAxis
                    type="category"
                    dataKey="menuItemName"
                    width={160}
                    tick={{ fontSize: 11, fill: "#5f5a52" }}
                    axisLine={{ stroke: "#d8d1c4" }}
                    tickLine={false}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#d8d1c4" horizontal={false} />
                  <Tooltip content={<ItemsTooltip />} />
                  <Bar dataKey="revenue" fill="#111111" radius={[0, 4, 4, 0]} name="درآمد" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data table */}
          {!loading && !error && itemsData.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-ink-muted font-normal w-12">رتبه</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">نام آیتم</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">تعداد فروش</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">درآمد</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">میانگین قیمت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {itemsData.map((item, i) => (
                    <tr key={item.menuItemId} className="hover:bg-surface/50">
                      <td className="px-4 py-2 text-ink-muted text-xs">{i + 1}</td>
                      <td className="px-4 py-2 text-ink">{item.menuItemName}</td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {item.quantity.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {formatCurrency(item.avgPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============ TAB 3: HOURS ============ */}
      {activeTab === "hours" && (
        <>
          {/* Peak hours summary */}
          {!loading && !error && hourlyData.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-4 text-center text-sm text-ink-muted">
              {(() => {
                const peak = hourlyData.reduce((max, h) => (h.revenue > max.revenue ? h : max), hourlyData[0]);
                return (
                  <>
                    ساعت شلوغ: {peak.hour}:00 | بیشترین درآمد: {formatCurrency(peak.revenue)} تومان
                  </>
                );
              })()}
            </div>
          )}

          {loading && <div className="py-12 text-center text-sm text-ink-muted">در حال بارگذاری...</div>}
          {!loading && !error && hourlyData.length === 0 && (
            <div className="py-12 text-center text-sm text-ink-muted">داده‌ای برای نمایش وجود ندارد</div>
          )}

          {/* Hourly bar chart */}
          {!loading && !error && hourlyData.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-4" style={{ overflow: "visible" }}>
              <style>{`.hours-chart svg { overflow: visible !important; }`}</style>
              <ResponsiveContainer width="100%" height={320} className="hours-chart">
                <BarChart data={hourlyData} margin={{ top: 8, right: 24, left: 24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d8d1c4" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 11, fill: "#5f5a52" }}
                    axisLine={{ stroke: "#d8d1c4" }}
                    tickLine={false}
                    tickFormatter={(v: number) => `${v}:00`}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#5f5a52", dx: -4 }}
                    axisLine={{ stroke: "#d8d1c4" }}
                    tickLine={false}
                    tickFormatter={(v: number) => (v / 1_000_000).toFixed(1) + "M"}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#111111" radius={[4, 4, 0, 0]} name="درآمد" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data table */}
          {!loading && !error && hourlyData.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-ink-muted font-normal">ساعت</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">تعداد سفارش</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">تعداد آیتم</th>
                    <th className="px-4 py-2 text-ink-muted font-normal">درآمد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {hourlyData.map((h) => (
                    <tr key={h.hour} className="hover:bg-surface/50">
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {h.hour}:00
                      </td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {h.orders.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {h.items.toLocaleString("fa-IR")}
                      </td>
                      <td className="px-4 py-2 text-ink" dir="ltr">
                        {formatCurrency(h.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ============ TAB 4: EXPORT ============ */}
      {activeTab === "export" && (
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-serif text-lg text-ink-strong">خروجی CSV</h2>

          {/* Date range */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              از
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              تا
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink"
              />
            </label>
          </div>

          {/* Format selector */}
          <div>
            <p className="mb-2 text-sm text-ink-muted">نوع خروجی:</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="overview"
                  checked={exportType === "overview"}
                  onChange={() => setExportType("overview")}
                  className="accent-ink"
                />
                خلاصه فروش
              </label>
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                <input
                  type="radio"
                  name="exportType"
                  value="items"
                  checked={exportType === "items"}
                  onChange={() => setExportType("items")}
                  className="accent-ink"
                />
                جزئیات آیتم‌ها
              </label>
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={!startDate || !endDate || exportLoading}
            className="rounded-xl border border-ink bg-ink px-6 py-2 text-sm text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {exportLoading ? "در حال دانلود..." : "دانلود CSV"}
          </button>
        </div>
      )}
    </div>
  );
}

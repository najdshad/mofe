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

interface DataPoint {
  date: string;
  persianDate: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

function toPersianDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const j = toJalaali(y, m, d);
  return `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`;
}

interface Summary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

interface SalesResponse {
  venueId: string;
  range: string;
  start: string;
  end: string;
  data: DataPoint[];
  summary: Summary;
}

const RANGE_LABELS: Record<RangeKey, string> = {
  daily: "روز",
  weekly: "هفته",
  monthly: "ماه",
  yearly: "سال",
  custom: "دلخواه",
};

const RANGE_KEYS: RangeKey[] = ["daily", "weekly", "monthly", "yearly", "custom"];

function formatCurrency(n: number): string {
  return n.toLocaleString("fa-IR");
}

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

export function SalesClient({
  venueId,
}: {
  venueId: string;
  currentUserRole: string;
}) {
  const [range, setRange] = useState<RangeKey>("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<DataPoint[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const doFetch = useCallback(
    (r: RangeKey, start?: string, end?: string) => {
      const params = new URLSearchParams({ range: r });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      fetch(`/api/venues/${venueId}/sales?${params}`)
        .then((res) => {
          if (!res.ok) return res.json().then((b) => Promise.reject(new Error(b?.error || "Failed to fetch sales data")));
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
    [venueId]
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setLoading(true);
      setError(null);
      doFetch(range);
    }, 0);
    return () => clearTimeout(id);
  }, [range, doFetch]);

  const handleCustomSubmit = () => {
    if (startDate && endDate) {
      setLoading(true);
      setError(null);
      doFetch("custom", startDate, endDate);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-ink-strong">گزارش فروش</h1>

      {/* Range tabs */}
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

      {/* Custom date picker */}
      {range === "custom" && (
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

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <div className="font-serif text-3xl text-ink-strong">
            {formatCurrency(summary.totalOrders)}
          </div>
          <div className="mt-1 text-xs text-ink-muted">سفارش</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <div className="font-serif text-3xl text-ink-strong">
            {formatCurrency(summary.totalRevenue)}
          </div>
          <div className="mt-1 text-xs text-ink-muted">درآمد (تومان)</div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 text-center">
          <div className="font-serif text-3xl text-ink-strong">
            {formatCurrency(summary.avgOrderValue)}
          </div>
          <div className="mt-1 text-xs text-ink-muted">میانگین هر سفارش</div>
        </div>
      </div>

      {/* Chart */}
      {loading && <div className="py-12 text-center text-sm text-ink-muted">در حال بارگذاری...</div>}
      {error && <div className="py-12 text-center text-sm text-red-500">{error}</div>}
      {!loading && !error && data.length === 0 && (
        <div className="py-12 text-center text-sm text-ink-muted">داده‌ای برای نمایش وجود ندارد</div>
      )}
      {!loading && !error && data.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4" style={{ overflow: "visible" }}>
          <style>{`.sales-chart svg { overflow: visible !important; }`}</style>
          <ResponsiveContainer width="100%" height={320} className="sales-chart">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d8d1c4" />
              <XAxis
                dataKey="persianDate"
                tick={{ fontSize: 10, fill: "#5f5a52" }}
                axisLine={{ stroke: "#d8d1c4" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#5f5a52" }}
                axisLine={{ stroke: "#d8d1c4" }}
                tickLine={false}
                tickFormatter={(v: number) => (v / 1_000_000).toFixed(3) + "M"}
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
                  <td className="px-4 py-2 text-ink" dir="ltr">{point.persianDate}</td>
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
    </div>
  );
}

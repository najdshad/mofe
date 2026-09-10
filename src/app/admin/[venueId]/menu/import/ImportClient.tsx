"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { fetchApi } from "@/lib/fetch-api";

interface Preview {
  summary: {
    validCount: number;
    invalidCount: number;
    currentItemCount: number;
    currentCategoryCount: number;
    newCategoryCount: number;
  };
  rows: { row: number; categoryNameFa: string; nameFa: string; priceToman: number }[];
  invalid: { row: number; nameFa: string; message?: string }[];
  newCategories: string[];
}

const faNum = (n: number) => n.toLocaleString("fa-IR");

export function ImportClient({ venueId }: { venueId: string }) {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{
    summary: { created: number; skipped: number; errors: number };
  } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const text = await file.text();
      const data: Preview = await fetchApi(`/api/venues/${venueId}/items/import-csv/preview`, {
        method: "POST",
        body: JSON.stringify({ csv: text }),
      });
      setCsvText(text);
      setFileName(file.name);
      setPreview(data);
      setExcluded(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در خواندن فایل");
      setPreview(null);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const toggleExclude = (row: number) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  };

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const data = await fetchApi(`/api/venues/${venueId}/items/import-csv`, {
        method: "POST",
        body: JSON.stringify({ csv: csvText, skipRows: Array.from(excluded) }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در اعمال ورود");
    } finally {
      setApplying(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setCsvText("");
    setFileName("");
    setResult(null);
    setError("");
    setExcluded(new Set());
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Panel title="ورود انجام شد" subtitle={fileName}>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-success">ایجاد: {faNum(result.summary.created)}</span>
            {result.summary.skipped > 0 && (
              <span className="text-accent">رد شده: {faNum(result.summary.skipped)}</span>
            )}
            {result.summary.errors > 0 && (
              <span className="text-danger">خطا: {faNum(result.summary.errors)}</span>
            )}
          </div>
          <div className="mt-5 flex gap-2">
            <a href={`/admin/${venueId}/menu`}>
              <Button>بازگشت به منو</Button>
            </a>
            <Button variant="secondary" onClick={reset}>
              ورود فایل دیگر
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold text-accent">منوی دیجیتال</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">ورود CSV</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
            منوی فعلی حذف و از روی فایل بازسازی می‌شود. پیش از اعمال، سطرها را بازبینی کنید.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/venues/${venueId}/items/csv-template`}
            className="inline-flex min-h-10 items-center rounded-xl border border-line bg-control px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink/40 hover:bg-control-hover"
          >
            دریافت قالب CSV
          </a>
          <a
            href={`/admin/${venueId}/menu`}
            className="inline-flex min-h-10 items-center rounded-xl border border-line bg-control px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink/40 hover:bg-control-hover"
          >
            بازگشت
          </a>
        </div>
      </header>

      <Panel title="۱. انتخاب فایل" subtitle="ساختار فایل با قالب CSV منو باید یکسان باشد">
        <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-canvas/60 px-4 py-8 text-sm text-ink-muted transition-colors hover:border-ink/40 hover:text-ink">
          {loading ? "در حال بررسی..." : fileName || "فایل CSV را انتخاب کنید"}
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} disabled={loading} />
        </label>
        {error && !preview && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Panel>

      {preview && (
        <>
          <Panel title="۲. بازبینی">
            <div className="rounded-xl border border-danger/35 bg-danger-soft px-4 py-3 text-xs leading-6 text-danger">
              منوی فعلی ({faNum(preview.summary.currentItemCount)} آیتم در{" "}
              {faNum(preview.summary.currentCategoryCount)} دسته) حذف و با{" "}
              {faNum(preview.summary.validCount - excluded.size)} آیتم از فایل جایگزین می‌شود.
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-success-soft px-3 py-1.5 text-success">
                سالم: {faNum(preview.summary.validCount)}
              </span>
              {preview.summary.invalidCount > 0 && (
                <span className="rounded-full bg-danger-soft px-3 py-1.5 text-danger">
                  مشکل‌دار: {faNum(preview.summary.invalidCount)}
                </span>
              )}
              {excluded.size > 0 && (
                <span className="rounded-full bg-control px-3 py-1.5 text-ink-muted">
                  کنارگذاشته‌شده: {faNum(excluded.size)}
                </span>
              )}
            </div>
            {preview.newCategories.length > 0 && (
              <p className="mt-3 text-xs leading-6 text-ink-muted">
                دسته‌های جدید ساخته می‌شوند: {preview.newCategories.join("، ")}
              </p>
            )}
          </Panel>

          {preview.rows.length > 0 && (
            <Panel
              title="سطرهای فایل"
              subtitle="تیک سطری را بردارید تا وارد نشود. سطرهای مشکل‌دار خودکار رد می‌شوند."
            >
              <ul className="space-y-1 text-xs">
                {preview.rows.map((r) => (
                  <li key={r.row} className="flex items-center justify-between rounded-lg bg-canvas/60 px-3 py-2">
                    <label className="flex cursor-pointer items-center gap-2 text-ink">
                      <input
                        type="checkbox"
                        checked={!excluded.has(r.row)}
                        onChange={() => toggleExclude(r.row)}
                      />
                      {r.nameFa}
                      <span className="text-ink-muted">{r.categoryNameFa}</span>
                    </label>
                    <span className="text-ink-muted">{faNum(r.priceToman)} تومان</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {preview.invalid.length > 0 && (
            <Panel title="سطرهای مشکل‌دار" subtitle="این سطرها وارد نمی‌شوند؛ فایل را اصلاح و دوباره انتخاب کنید">
              <div className="space-y-1 text-xs">
                {preview.invalid.map((d) => (
                  <div key={d.row} className="rounded bg-danger-soft px-2 py-1 text-danger">
                    سطر {faNum(d.row)}: {d.nameFa || "(بدون نام)"} — {d.message}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4 shadow-xl">
            <p className="text-xs text-ink-muted">
              {faNum(preview.summary.validCount - excluded.size)} آیتم وارد می‌شود
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={reset}>
                انصراف
              </Button>
              <Button
                onClick={handleApply}
                disabled={applying || preview.summary.validCount - excluded.size === 0}
              >
                {applying ? "در حال اعمال..." : "حذف منوی فعلی و ورود"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

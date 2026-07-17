"use client";

import { tagColor } from "@/lib/tag-colors";
import type { TableInfo } from "./types";

export function TableGrid({
  tables,
  selectedTable,
  onSelectTable,
  editMode,
  onEdit,
  onDelete,
  onAddTable,
}: {
  tables: TableInfo[];
  selectedTable: number | null;
  onSelectTable: (n: number) => void;
  editMode?: boolean;
  onEdit?: (table: { id: string; number: number; label?: string; tags?: string[] }) => void;
  onDelete?: (id: string) => void;
  onAddTable?: () => void;
}) {
  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-amber-400";
      case "ready":
        return "bg-blue-400";
      case "settled":
        return "bg-gray-400";
      default:
        return "bg-green-400";
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {editMode && onAddTable && (
        <button
          onClick={onAddTable}
          aria-label="افزودن میز جدید"
          className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-line bg-paper p-6 transition-all hover:border-ink/50"
        >
          <span className="text-3xl font-serif text-ink-muted">+</span>
          <span className="text-xs text-ink-muted">افزودن میز</span>
        </button>
      )}
      {tables.map((t) => (
        <div key={t.tableId} className="relative">
          <button
            aria-label={`میز ${t.tableNumber}`}
            onClick={() => onSelectTable(t.tableNumber)}
            className={`flex w-full flex-col items-center rounded-[var(--radius-card)] border-2 p-4 pt-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
              selectedTable === t.tableNumber
                ? "border-ink bg-surface shadow-sm"
                : "border-line bg-paper hover:border-ink/50 hover:shadow-sm"
            }`}
          >
            {t.tags && t.tags.length > 0 && (
              <div className="mb-2 flex w-full flex-wrap justify-center gap-1">
                {t.tags.map((tag) => {
                  const [bg, border, text] = tagColor(tag);
                  return (
                    <span
                      key={tag}
                      className={`rounded-full border px-2 py-[1px] text-[10px] leading-relaxed ${bg} ${border} ${text}`}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}
            <span className="text-3xl font-serif text-ink-strong">
              {t.tableNumber}
            </span>
            {t.label && (
              <span className="mt-0.5 text-xs text-ink-muted">{t.label}</span>
            )}
            <span
              className={`mt-2 h-3 w-3 rounded-full transition-colors duration-300 ${statusColor(t.status)}`}
            />
          </button>
          {editMode && (
            <>
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit({ id: t.tableId, number: t.tableNumber, label: t.label, tags: t.tags });
                  }}
                  aria-label="ویرایش میز"
                  className="absolute left-0.5 top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
                >
                  ✎
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.tableId);
                  }}
                  aria-label="حذف میز"
                  className="absolute right-0.5 top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-paper text-xs text-ink-muted transition-colors hover:border-red-400 hover:text-red-500"
                >
                  ✕
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

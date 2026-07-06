"use client";

export interface TableInfo {
  tableNumber: number;
  tableId: string;
  status: "free" | "active" | "ready";
}

export function TableGrid({
  tables,
  selectedTable,
  onSelectTable,
}: {
  tables: TableInfo[];
  selectedTable: number | null;
  onSelectTable: (n: number) => void;
}) {
  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-amber-400";
      case "ready":
        return "bg-blue-400";
      default:
        return "bg-green-400";
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 md:grid-cols-5">
      {tables.map((t) => (
        <button
          key={t.tableNumber}
          onClick={() => onSelectTable(t.tableNumber)}
          className={`flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 p-6 transition-all ${
            selectedTable === t.tableNumber
              ? "border-ink bg-surface"
              : "border-line bg-paper hover:border-ink/50"
          }`}
        >
          <span className="text-3xl font-serif text-ink-strong">
            {t.tableNumber}
          </span>
          <span
            className={`h-3 w-3 rounded-full ${statusColor(t.status)}`}
          />
        </button>
      ))}
    </div>
  );
}

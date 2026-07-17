import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import type { TableInfo, OrderData } from "@/components/orders/types";

const persianDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function toPersianNum(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => persianDigits[+d]);
}

interface FuseDocument {
  tableNumber: string;
  label: string;
  tags: string[];
  menuItemNames: string[];
  waiterNames: string[];
  itemNotes: string[];
  original: TableInfo;
}

function buildDocuments(
  tables: TableInfo[],
  orders: Map<string, OrderData>
): FuseDocument[] {
  return tables.map((table) => {
    const tableOrders: OrderData[] = [];
    for (const order of orders.values()) {
      if (order.tableNumber === String(table.tableNumber)) {
        tableOrders.push(order);
      }
    }

    const menuItemNames: string[] = [];
    const waiterNames: string[] = [];
    const itemNotes: string[] = [];

    for (const order of tableOrders) {
      if (order.createdBy) waiterNames.push(order.createdBy);
      for (const item of order.items) {
        if (item.menuItemName) menuItemNames.push(item.menuItemName);
        if (item.notes) itemNotes.push(item.notes);
      }
    }

    return {
      tableNumber: `${table.tableNumber} ${toPersianNum(table.tableNumber)}`,
      label: table.label ?? "",
      tags: table.tags ?? [],
      menuItemNames,
      waiterNames,
      itemNotes,
      original: table,
    };
  });
}

export function useFuzzySearch(
  query: string,
  tables: TableInfo[],
  orders: Map<string, OrderData>
): TableInfo[] {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(query);
    }, 200);
    return () => clearTimeout(id);
  }, [query]);

  return useMemo(() => {
    if (!debouncedQuery) return tables;

    const documents = buildDocuments(tables, orders);

    const fuse = new Fuse<FuseDocument>(documents, {
      keys: [
        { name: "tableNumber", weight: 0.4 },
        { name: "label", weight: 0.25 },
        { name: "tags", weight: 0.25 },
        { name: "menuItemNames", weight: 0.1 },
        { name: "waiterNames", weight: 0.05 },
        { name: "itemNotes", weight: 0.05 },
      ],
      threshold: 0.4,
      includeScore: true,
    });

    return fuse.search(debouncedQuery).map((r) => r.item.original);
  }, [debouncedQuery, tables, orders]);
}

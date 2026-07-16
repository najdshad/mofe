"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import type { CategoryData, MenuItemData, VariantData } from "./types";

export function MenuItemBrowser({
  categories,
  onSelect,
  onClose,
}: {
  categories: CategoryData[];
  onSelect: (menuItemId: string, variantId?: string, quantity?: number) => void;
  onClose: () => void;
}) {
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id || "");
  const [search, setSearch] = useState("");

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const items = (activeCategory?.items || []).filter(
    (item) =>
      !item.isSoldOut &&
      (item.nameFa.includes(search) || (item.nameEn && item.nameEn.toLowerCase().includes(search.toLowerCase())))
  );

  const [selectedItem, setSelectedItem] = useState<MenuItemData | null>(null);
  const variantOverlayRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const variantFirstFocusableRef = useRef<HTMLButtonElement | null>(null);

  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const selectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(",")));
  }, []);

  useEffect(() => {
    if (selectedItem) {
      triggerRef.current = document.activeElement as HTMLButtonElement;
      requestAnimationFrame(() => {
        if (variantFirstFocusableRef.current) {
          variantFirstFocusableRef.current.focus();
        }
      });
    } else if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedItem(null);
        return;
      }
      if (e.key === "Tab" && variantOverlayRef.current) {
        const focusable = getFocusableElements(variantOverlayRef.current);
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, getFocusableElements]);

  function handleItemClick(item: MenuItemData) {
    if (item.variants.length > 0) {
      setSelectedItem(item);
    } else {
      onSelect(item.id, undefined, 1);
      onClose();
    }
  }

  function handleVariantSelect(variant: VariantData) {
    if (!selectedItem) return;
    onSelect(selectedItem.id, variant.id, 1);
    setSelectedItem(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 flex h-[80vh] w-full max-w-lg flex-col rounded-[var(--radius-panel)] border border-line bg-paper shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-lg font-serif text-ink-strong">افزودن آیتم</h2>
          <Button variant="tertiary" size="sm" onClick={onClose}>
            بستن
          </Button>
        </div>

        <div className="px-4 py-2">
          <input
            type="text"
            placeholder="جستجو..."
            aria-label="جستجوی آیتم‌ها"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ink focus-visible:ring-2 focus-visible:ring-ink/20"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              aria-pressed={activeCategoryId === cat.id}
              onClick={() => { setActiveCategoryId(cat.id); setSearch(""); }}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
                activeCategoryId === cat.id
                  ? "bg-ink text-paper"
                  : "bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              {cat.nameFa}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                aria-label={`${item.nameFa} — ${item.priceToman.toLocaleString("fa-IR")} تومان`}
                onClick={() => handleItemClick(item)}
                className="rounded-[var(--radius-control)] border border-line bg-surface p-3 text-right transition-all duration-200 hover:border-ink hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
              >
                <p className="text-sm font-medium text-ink">{item.nameFa}</p>
                {item.nameEn && (
                  <p className="text-xs text-ink-muted">{item.nameEn}</p>
                )}
                <p className="mt-1 text-sm font-medium text-ink">
                  {item.priceToman.toLocaleString("fa-IR")} تومان
                </p>
                {item.variants.length > 0 && (
                  <span className="mt-1 inline-block rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-muted">
                    دارای تنوع
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div
          ref={variantOverlayRef}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
          onClick={() => setSelectedItem(null)}
          onKeyDown={(e) => { if (e.key === "Escape") setSelectedItem(null); }}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-[var(--radius-panel)] border border-line bg-paper p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-serif text-ink-strong">{selectedItem.nameFa}</h3>
            <div className="mt-3 flex flex-col gap-2">
              {selectedItem.variants.map((v, i) => (
                <button
                  key={v.id}
                  ref={i === 0 ? variantFirstFocusableRef : undefined}
                  onClick={() => handleVariantSelect(v)}
                  className="flex items-center justify-between rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-right transition-all duration-200 hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                  <span className="text-sm text-ink">{v.nameFa}</span>
                  <span className="text-sm font-medium text-ink">
                    {(selectedItem.priceToman + v.priceModifier).toLocaleString("fa-IR")} تومان
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              onClick={() => setSelectedItem(null)}
              className="mt-3 w-full"
            >
              انصراف
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

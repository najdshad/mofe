"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { QRCodeExport } from "@/components/ui/QRCodeExport";
import { QrCode, X } from "lucide-react";

interface QRIconButtonProps {
  venueName: string;
  publicUrl: string;
  showLabel?: boolean;
}

export function QRIconButton({ venueName, publicUrl, showLabel = false }: QRIconButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

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
    if (open) {
      triggerRef.current = document.activeElement as HTMLButtonElement;
      requestAnimationFrame(() => {
        if (dialogRef.current) {
          const focusable = getFocusableElements(dialogRef.current);
          if (focusable.length > 0) focusable[0].focus();
          else dialogRef.current.focus();
        }
      });
    } else if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [open, getFocusableElements]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = getFocusableElements(dialogRef.current);
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
  }, [open, getFocusableElements]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-panel text-sm text-ink transition-colors hover:border-ink/40 hover:bg-white ${
          showLabel ? "w-full px-3 py-2.5" : "h-9 w-9"
        }`}
        title="خروجی QR"
      >
        <QrCode className="h-[18px] w-[18px]" strokeWidth={1.8} />
        {showLabel && "دریافت QR منو"}
      </button>
      {open &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="خروجی QR"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 p-4 backdrop-blur-[2px]"
            onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          >
            <div className="flex w-full max-w-md flex-col items-center rounded-[var(--radius-panel)] border border-line bg-panel p-6 shadow-2xl">
              <div className="flex w-full items-center justify-between mb-5">
                <h3 className="font-serif text-xl text-ink">خروجی QR</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink"
                  aria-label="بستن"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex w-full flex-col items-center gap-5">
                <QRCodeExport
                  publicUrl={publicUrl}
                  venueName={venueName}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

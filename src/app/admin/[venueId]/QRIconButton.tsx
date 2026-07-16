"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QRCodeExport } from "@/components/ui/QRCodeExport";

interface QRIconButtonProps {
  venueName: string;
  publicUrl: string;
  isUnpublished: boolean;
}

export function QRIconButton({ venueName, publicUrl, isUnpublished }: QRIconButtonProps) {
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
        className="p-1.5 text-ink-muted hover:text-ink transition-colors rounded-lg hover:bg-surface"
        title="خروجی QR"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="8" height="8" rx="1"/>
          <rect x="14" y="2" width="8" height="8" rx="1"/>
          <rect x="2" y="14" width="8" height="8" rx="1"/>
          <path d="M14 14h3v3h-3z"/>
          <path d="M19 14h3v3h-3z"/>
          <path d="M14 19h3v3h-3z"/>
          <path d="M19 19h3v3h-3z"/>
        </svg>
      </button>
      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="خروجی QR"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        >
          <div className="flex w-full max-w-md flex-col items-center rounded-[var(--radius-panel)] border border-line bg-paper p-6 shadow-lg">
            <div className="flex w-full items-center justify-between mb-5">
              <h3 className="font-serif text-xl text-ink">خروجی QR</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-ink transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="flex w-full flex-col items-center gap-5">
              <QRCodeExport
                publicUrl={publicUrl}
                venueName={venueName}
                isUnpublished={isUnpublished}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

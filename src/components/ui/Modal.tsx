"use client";

import { useEffect, useRef, useCallback, useId } from "react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: "primary" | "destructive";
  loading?: boolean;
}

export function Modal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "تأیید",
  confirmVariant = "primary",
  loading = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

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
      const prevFocus = document.activeElement as HTMLElement;
      previousFocusRef.current = prevFocus;
      document.body.style.overflow = "hidden";

      const raf = requestAnimationFrame(() => {
        if (dialogRef.current) {
          const focusable = getFocusableElements(dialogRef.current);
          if (focusable.length > 0) {
            focusable[0].focus();
          } else {
            dialogRef.current.focus();
          }
        }
      });

      return () => {
        cancelAnimationFrame(raf);
        document.body.style.overflow = "";
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      };
    } else {
      document.body.style.overflow = "";
      return undefined;
    }
  }, [open, getFocusableElements]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
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

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, getFocusableElements]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md rounded-[var(--radius-panel)] border border-line bg-paper p-6 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
      >
        <h3 id={titleId} className="font-serif text-xl text-ink">{title}</h3>
        <div className="mt-3 max-h-[55vh] overflow-y-auto text-sm leading-relaxed text-ink-muted">
          {children}
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="tertiary" onClick={onClose} disabled={loading}>
            انصراف
          </Button>
          {onConfirm && (
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "..." : confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

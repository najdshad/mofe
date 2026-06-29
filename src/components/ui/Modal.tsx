"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

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
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-[var(--radius-panel)] border border-line bg-paper p-6 shadow-lg"
      >
        <h3 className="font-serif text-xl text-ink">{title}</h3>
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

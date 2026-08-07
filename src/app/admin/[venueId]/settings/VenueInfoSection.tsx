"use client";

import { Check, Languages } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface VenueInfoSectionProps {
  nameFa: string;
  nameEn: string;
  venueStatus: string;
  onNameFaChange: (v: string) => void;
  onNameEnChange: (v: string) => void;
  onSave: () => void;
}

export function VenueInfoSection({
  nameFa,
  nameEn,
  venueStatus,
  onNameFaChange,
  onNameEnChange,
  onSave,
}: VenueInfoSectionProps) {
  return (
    <Panel title="نام مجموعه" subtitle="نام‌هایی که در منوی عمومی نمایش داده می‌شوند.">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Languages className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="نام فارسی"
          value={nameFa}
          onChange={(e) => onNameFaChange(e.target.value)}
        />
        <Input
          label="نام انگلیسی (اختیاری)"
          value={nameEn}
          onChange={(e) => onNameEnChange(e.target.value)}
          dir="ltr"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line/80 pt-4">
        <Button onClick={onSave}>
          <Check className="h-4 w-4" strokeWidth={1.8} />
          ذخیره اطلاعات
        </Button>
        {venueStatus && (
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-muted" role="status" aria-live="polite">
            <Check className="h-4 w-4 text-emerald-700" strokeWidth={1.8} />
            {venueStatus}
          </p>
        )}
      </div>
    </Panel>
  );
}

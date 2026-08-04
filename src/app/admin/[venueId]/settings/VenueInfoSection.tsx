"use client";

import { Check } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TIMEZONE_LABELS } from "@/lib/constants";

interface VenueInfoSectionProps {
  nameFa: string;
  nameEn: string;
  timezone: string;
  venueStatus: string;
  onNameFaChange: (v: string) => void;
  onNameEnChange: (v: string) => void;
  onTimezoneChange: (v: string) => void;
  onSave: () => void;
}

export function VenueInfoSection({
  nameFa,
  nameEn,
  timezone,
  venueStatus,
  onNameFaChange,
  onNameEnChange,
  onTimezoneChange,
  onSave,
}: VenueInfoSectionProps) {
  return (
    <Panel
      title="اطلاعات مجموعه"
      subtitle="نام و منطقه زمانی پیش‌فرض منوی شما."
      className="overflow-hidden shadow-sm"
    >
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
        <div className="space-y-1.5 sm:col-span-2">
          <label
            htmlFor="venue-timezone"
            className="block text-xs tracking-[0.14em] text-ink-muted"
          >
            منطقه زمانی
          </label>
          <select
            id="venue-timezone"
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink transition-colors focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            {Object.entries(TIMEZONE_LABELS).map(([tz, label]) => (
              <option key={tz} value={tz}>
                {label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-ink-muted">
            ساعت‌های فعالیت بر اساس این منطقه زمانی نمایش داده می‌شوند.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
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

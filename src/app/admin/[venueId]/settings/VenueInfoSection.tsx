"use client";

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
    <Panel title="اطلاعات مجموعه" subtitle="ویرایش مشخصات مجموعه">
      <div className="space-y-4">
        <Input
          label="نام فارسی"
          value={nameFa}
          onChange={(e) => onNameFaChange(e.target.value)}
        />
        <Input
          label="نام انگلیسی (اختیاری)"
          value={nameEn}
          onChange={(e) => onNameEnChange(e.target.value)}
        />
        <div className="space-y-1.5">
          <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted">
            منطقه زمانی
          </label>
          <select
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="w-full rounded-[var(--radius-control)] border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-ink focus:outline-none"
          >
            {Object.entries(TIMEZONE_LABELS).map(([tz, label]) => (
              <option key={tz} value={tz}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={onSave}>ذخیره تغییرات</Button>
        {venueStatus && (
          <p className="text-sm text-ink-muted">{venueStatus}</p>
        )}
      </div>
    </Panel>
  );
}

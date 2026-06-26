"use client";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { TIMEZONE_LABELS } from "@/lib/constants";

interface VenueInfoSectionProps {
  nameFa: string;
  nameEn: string;
  timezone: string;
  menuPhotoMode: boolean;
  venueStatus: string;
  onNameFaChange: (v: string) => void;
  onNameEnChange: (v: string) => void;
  onTimezoneChange: (v: string) => void;
  onMenuPhotoModeChange: (v: boolean) => void;
  onSave: () => void;
}

export function VenueInfoSection({
  nameFa,
  nameEn,
  timezone,
  menuPhotoMode,
  venueStatus,
  onNameFaChange,
  onNameEnChange,
  onTimezoneChange,
  onMenuPhotoModeChange,
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
        <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
          <Toggle
            on={menuPhotoMode}
            onChange={(v) => onMenuPhotoModeChange(v)}
          />
          <div>
            <div className="text-sm text-ink">نمایش عکس آیتم‌ها در منوی عمومی</div>
            <div className="text-xs text-ink-muted">با فعال‌سازی، عکس آیتم‌ها در منوی منتشر شده نمایش داده می‌شود</div>
          </div>
        </div>
        <Button onClick={onSave}>ذخیره تغییرات</Button>
        {venueStatus && (
          <p className="text-sm text-ink-muted">{venueStatus}</p>
        )}
      </div>
    </Panel>
  );
}

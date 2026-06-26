"use client";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { STATION_LABELS, DAY_LABELS, VALID_STATIONS } from "@/lib/constants";

interface Schedule {
  station: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface ScheduleSectionProps {
  schedules: Schedule[];
  loading: boolean;
  status: string;
  onToggle: (station: string, dayOfWeek: number) => void;
  onTimeChange: (station: string, dayOfWeek: number, field: "startTime" | "endTime", value: string) => void;
  onSave: () => void;
}

export function ScheduleSection({
  schedules,
  loading,
  status,
  onToggle,
  onTimeChange,
  onSave,
}: ScheduleSectionProps) {
  return (
    <Panel title="زمان‌بندی ایستگاه‌ها" subtitle="تنظیم ساعات فعالیت آشپزخانه و بار">
      <div className="space-y-4">
        {VALID_STATIONS.map((station) => (
          <div key={station}>
            <h4 className="mb-2 text-sm text-ink">{STATION_LABELS[station] || station}</h4>
            <div className="space-y-1">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                const s = schedules.find((sch) => sch.station === station && sch.dayOfWeek === day);
                const active = s?.isActive ?? false;
                return (
                  <div key={day} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                    <Toggle on={active} onChange={() => onToggle(station, day)} />
                    <span className="w-20 text-xs text-ink">{DAY_LABELS[day]}</span>
                    {active && (
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={s?.startTime ?? "08:00"}
                          onChange={(e) => onTimeChange(station, day, "startTime", e.target.value)}
                          className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
                        />
                        <span className="text-xs text-ink-muted">تا</span>
                        <input
                          type="time"
                          value={s?.endTime ?? "23:00"}
                          onChange={(e) => onTimeChange(station, day, "endTime", e.target.value)}
                          className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink focus:border-ink focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={onSave} disabled={loading}>
            {loading ? "..." : "ذخیره زمان‌بندی"}
          </Button>
          {status && <span className="text-xs text-ink-muted">{status}</span>}
        </div>
      </div>
    </Panel>
  );
}

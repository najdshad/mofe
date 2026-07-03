"use client";

import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { TimePicker } from "@/components/ui/TimePicker";
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
  onApplyAll: (station: string, startTime: string, endTime: string, isActive: boolean) => void;
  onSave: () => void;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function ScheduleSection({
  schedules,
  loading,
  status,
  onToggle,
  onTimeChange,
  onApplyAll,
  onSave,
}: ScheduleSectionProps) {
  return (
    <Panel title="زمان‌بندی ایستگاه‌ها" subtitle="تنظیم ساعات فعالیت آشپزخانه و بار">
      <div className="space-y-4">
        {VALID_STATIONS.map((station) => {
          const stationSchedules = DAYS.map((day) => {
            const s = schedules.find((sch) => sch.station === station && sch.dayOfWeek === day);
            return s ?? { station, dayOfWeek: day, startTime: "07:00", endTime: "23:30", isActive: true };
          });
          const allSameTime = stationSchedules.every(
            (s) => s.startTime === stationSchedules[0].startTime && s.endTime === stationSchedules[0].endTime && s.isActive === stationSchedules[0].isActive
          );
          const master = stationSchedules[0];

          return (
            <div key={station}>
              <h4 className="mb-2 text-sm text-ink">{STATION_LABELS[station] || station}</h4>

              <div className="mb-2 rounded-xl border border-line bg-surface px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Toggle
                    on={master.isActive}
                    onChange={(v) => onApplyAll(station, master.startTime, master.endTime, v)}
                  />
                  <span className="text-xs text-ink-muted">اعمال به همه روزها</span>
                  <div className="mr-auto flex items-center gap-1">
                    <TimePicker
                      value={master.startTime}
                      onChange={(v) => onApplyAll(station, v, master.endTime, master.isActive)}
                    />
                    <span className="text-xs text-ink-muted">تا</span>
                    <TimePicker
                      value={master.endTime}
                      onChange={(v) => onApplyAll(station, master.startTime, v, master.isActive)}
                    />
                    {!allSameTime && (
                      <button
                        onClick={() => onApplyAll(station, master.startTime, master.endTime, master.isActive)}
                        className="mr-1 rounded-md border border-line px-2 py-1 text-[10px] text-ink-muted hover:text-ink transition-colors"
                      >
                        اعمال
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                {DAYS.map((day) => {
                  const s = stationSchedules[day];
                  return (
                    <div key={day} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                      <Toggle on={s.isActive} onChange={() => onToggle(station, day)} />
                      <span className="w-20 text-xs text-ink">{DAY_LABELS[day]}</span>
                      {s.isActive && (
                        <div className="mr-auto flex items-center gap-1">
                          <TimePicker
                            value={s.startTime}
                            onChange={(v) => onTimeChange(station, day, "startTime", v)}
                          />
                          <span className="text-xs text-ink-muted">تا</span>
                          <TimePicker
                            value={s.endTime}
                            onChange={(v) => onTimeChange(station, day, "endTime", v)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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

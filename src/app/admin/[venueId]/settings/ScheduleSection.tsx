"use client";

import { Check, Clock3 } from "lucide-react";
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
    <Panel
      title="زمان‌بندی ایستگاه‌ها"
      subtitle="ساعات فعالیت آشپزخانه و بار را برای هر روز تنظیم کنید."
      className="overflow-hidden shadow-sm"
    >
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
          const activeDays = stationSchedules.filter((schedule) => schedule.isActive).length;

          return (
            <div
              key={station}
              className="rounded-[22px] border border-line bg-surface/40 p-3 sm:p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper text-ink">
                    <Clock3 className="h-4 w-4" strokeWidth={1.7} />
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-ink">
                      {STATION_LABELS[station] || station}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {activeDays > 0 ? `${activeDays} روز فعال` : "در تمام روزها غیرفعال"}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] ${
                    activeDays > 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-line bg-paper text-ink-muted"
                  }`}
                >
                  {activeDays > 0 ? "فعال" : "بسته"}
                </span>
              </div>

              <div className="mb-3 rounded-2xl border border-line bg-paper px-3 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Toggle
                      on={master.isActive}
                      aria-label={`اعمال برنامه ${STATION_LABELS[station] || station} به همه روزها`}
                      onChange={(v) => onApplyAll(station, master.startTime, master.endTime, v)}
                    />
                    <span className="text-xs text-ink-muted">اعمال به همه روزها</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:mr-auto">
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
                        type="button"
                        onClick={() => onApplyAll(station, master.startTime, master.endTime, master.isActive)}
                        className="mr-1 rounded-full border border-line px-2.5 py-1.5 text-[10px] text-ink-muted transition-colors hover:border-ink hover:text-ink"
                      >
                        اعمال
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {DAYS.map((day) => {
                  const s = stationSchedules[day];
                  return (
                    <div
                      key={day}
                      className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 py-2.5 transition-colors ${
                        s.isActive
                          ? "border-line bg-paper"
                          : "border-line/70 bg-transparent"
                      }`}
                    >
                      <Toggle
                        on={s.isActive}
                        aria-label={`${DAY_LABELS[day]} ${STATION_LABELS[station] || station}`}
                        onChange={() => onToggle(station, day)}
                      />
                      <span className="w-16 shrink-0 text-xs text-ink">{DAY_LABELS[day]}</span>
                      {s.isActive && (
                        <div className="mr-auto flex items-center gap-1.5">
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
                      {!s.isActive && (
                        <span className="mr-auto text-[11px] text-ink-muted">بسته</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button onClick={onSave} disabled={loading}>
            <Check className="h-4 w-4" strokeWidth={1.8} />
            {loading ? "در حال ذخیره..." : "ذخیره زمان‌بندی"}
          </Button>
          {status && (
            <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted" role="status" aria-live="polite">
              <Check className="h-4 w-4 text-emerald-700" strokeWidth={1.8} />
              {status}
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}

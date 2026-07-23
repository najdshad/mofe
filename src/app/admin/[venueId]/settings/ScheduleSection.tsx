"use client";

import { useState, useMemo, useCallback } from "react";
import { Check, Clock3, Plus, X, Ban } from "lucide-react";
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
  onSetDefaults: (station: string, startTime: string, endTime: string, isActive: boolean, protectedDays: number[]) => void;
  onResetDay: (station: string, dayOfWeek: number, startTime: string, endTime: string, isActive: boolean) => void;
  onSave: () => void;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6];

function getDefaultSchedule(schedules: (Schedule | undefined)[]): Schedule | null {
  const valid = schedules.filter((s): s is Schedule => !!s);
  if (valid.length === 0) return null;
  const freq = new Map<string, { count: number; schedule: Schedule }>();
  for (const s of valid) {
    const key = `${s.startTime}|${s.endTime}|${s.isActive}`;
    const existing = freq.get(key);
    if (existing) {
      existing.count++;
    } else {
      freq.set(key, { count: 1, schedule: s });
    }
  }
  let best = { count: 0, schedule: valid[0] };
  for (const { count, schedule } of freq.values()) {
    if (count > best.count) {
      best = { count, schedule };
    }
  }
  return best.schedule;
}

export function ScheduleSection(props: ScheduleSectionProps) {
  const {
    schedules,
    loading,
    status,
    onToggle,
    onTimeChange,
    onApplyAll,
    onSetDefaults,
    onResetDay,
    onSave,
  } = props;

  const [addingStation, setAddingStation] = useState<string | null>(null);
  const [forcedExceptions, setForcedExceptions] = useState<Set<string>>(new Set());

  const autoExceptions = useMemo(() => {
    const result = new Set<string>();
    for (const station of VALID_STATIONS) {
      const stationSchedules = DAYS.map((day) =>
        schedules.find((s) => s.station === station && s.dayOfWeek === day)
      );
      const def = getDefaultSchedule(stationSchedules);
      if (!def) continue;
      for (const s of stationSchedules) {
        if (
          s &&
          (s.startTime !== def.startTime ||
            s.endTime !== def.endTime ||
            s.isActive !== def.isActive)
        ) {
          result.add(`${station}-${s.dayOfWeek}`);
        }
      }
    }
    return result;
  }, [schedules]);

  const mergedExceptions = useMemo(() => {
    const merged = new Set(autoExceptions);
    for (const k of forcedExceptions) merged.add(k);
    return merged;
  }, [autoExceptions, forcedExceptions]);

  const handleForceDay = useCallback((station: string, day: number) => {
    setForcedExceptions((prev) => new Set(prev).add(`${station}-${day}`));
  }, []);

  return (
    <Panel
      title="زمان‌بندی ایستگاه‌ها"
      subtitle="ساعت پیش‌فرض هر ایستگاه را تنظیم کنید. روزهایی که تنظیمات متفاوتی دارند به صورت جداگانه نمایش داده می‌شوند."
      className="overflow-hidden shadow-sm"
    >
      <div className="space-y-4">
        {VALID_STATIONS.map((station) => {
          const stationSchedules = DAYS.map((day) => {
            const s = schedules.find(
              (sch) => sch.station === station && sch.dayOfWeek === day
            );
            return (
              s ?? {
                station,
                dayOfWeek: day,
                startTime: "07:00",
                endTime: "23:30",
                isActive: true,
              }
            );
          });

          const defaultSchedule = getDefaultSchedule(stationSchedules);
          if (!defaultSchedule) return null;

          const protectedDayIndices = DAYS.filter((d) =>
            mergedExceptions.has(`${station}-${d}`)
          );
          const activeDays = stationSchedules.filter((s) => s.isActive).length;
          const defaultDayCount = DAYS.length - protectedDayIndices.length;

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
                      {activeDays > 0
                        ? `${activeDays} روز فعال`
                        : "در تمام روزها غیرفعال"}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-ink">
                    ساعت پیش‌فرض
                  </span>
                  <span className="text-[10px] text-ink-muted">
                    ({defaultDayCount} روز)
                  </span>
                  {protectedDayIndices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyAll(
                          station,
                          defaultSchedule.startTime,
                          defaultSchedule.endTime,
                          defaultSchedule.isActive
                        );
                        setForcedExceptions((prev) => {
                          const next = new Set(prev);
                          for (const d of DAYS)
                            next.delete(`${station}-${d}`);
                          return next;
                        });
                      }}
                      className="mr-auto rounded-full border border-line px-2.5 py-1 text-[10px] text-ink-muted transition-colors hover:border-ink hover:text-ink"
                    >
                      اعمال به همه
                    </button>
                  )}
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Toggle
                      on={defaultSchedule.isActive}
                      aria-label={`فعال/غیرفعال پیش‌فرض ${STATION_LABELS[station] || station}`}
                      onChange={(v) =>
                        onSetDefaults(
                          station,
                          defaultSchedule.startTime,
                          defaultSchedule.endTime,
                          v,
                          protectedDayIndices
                        )
                      }
                    />
                    <span className="text-xs text-ink-muted">
                      {defaultSchedule.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </div>
                  {defaultSchedule.isActive && (
                    <div className="flex items-center gap-1.5 sm:mr-auto">
                      <TimePicker
                        value={defaultSchedule.startTime}
                        onChange={(v) =>
                          onSetDefaults(
                            station,
                            v,
                            defaultSchedule.endTime,
                            defaultSchedule.isActive,
                            protectedDayIndices
                          )
                        }
                      />
                      <span className="text-xs text-ink-muted">تا</span>
                      <TimePicker
                        value={defaultSchedule.endTime}
                        onChange={(v) =>
                          onSetDefaults(
                            station,
                            defaultSchedule.startTime,
                            v,
                            defaultSchedule.isActive,
                            protectedDayIndices
                          )
                        }
                      />
                    </div>
                  )}
                  {!defaultSchedule.isActive && (
                    <span className="text-[11px] text-ink-muted sm:mr-auto">
                      تعطیل
                    </span>
                  )}
                </div>
              </div>

              {protectedDayIndices.length > 0 && (
                <div className="mb-3 rounded-2xl border border-dashed border-line/70 bg-paper/50 px-3 py-3">
                  <p className="mb-2 text-[11px] text-ink-muted">
                    تنظیمات اختصاصی روزها ({protectedDayIndices.length} روز)
                  </p>
                  <div className="space-y-2">
                    {protectedDayIndices.map((day) => {
                      const s = stationSchedules[day];
                      return (
                        <div
                          key={day}
                          className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2"
                        >
                          <span className="w-16 shrink-0 text-xs text-ink">
                            {DAY_LABELS[day]}
                          </span>
                          <Toggle
                            on={s.isActive}
                            aria-label={`${DAY_LABELS[day]} ${STATION_LABELS[station] || station}`}
                            onChange={() => onToggle(station, day)}
                          />
                          {s.isActive ? (
                            <div className="flex items-center gap-1.5">
                              <TimePicker
                                value={s.startTime}
                                onChange={(v) =>
                                  onTimeChange(station, day, "startTime", v)
                                }
                              />
                              <span className="text-xs text-ink-muted">تا</span>
                              <TimePicker
                                value={s.endTime}
                                onChange={(v) =>
                                  onTimeChange(station, day, "endTime", v)
                                }
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] text-ink-muted">
                              بسته
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onResetDay(
                                station,
                                day,
                                defaultSchedule.startTime,
                                defaultSchedule.endTime,
                                defaultSchedule.isActive
                              );
                              setForcedExceptions((prev) => {
                                const next = new Set(prev);
                                next.delete(`${station}-${day}`);
                                return next;
                              });
                            }}
                            className="mr-auto rounded-full p-1 text-ink-muted transition-colors hover:bg-surface hover:text-red-500"
                            aria-label={`حذف تنظیمات اختصاصی ${DAY_LABELS[day]}`}
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {protectedDayIndices.length < 7 && (
                <div>
                  {addingStation === station ? (
                    <div className="space-y-2 rounded-2xl border border-dashed border-line/70 bg-paper/30 px-3 py-2.5">
                      <p className="text-[11px] text-ink-muted">روز مورد نظر را انتخاب کنید:</p>
                      {DAYS.filter(
                        (d) => !mergedExceptions.has(`${station}-${d}`)
                      ).map((d) => (
                        <div
                          key={d}
                          className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-1.5"
                        >
                          <span className="w-16 text-xs text-ink">
                            {DAY_LABELS[d]}
                          </span>
                          <div className="mr-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleForceDay(station, d);
                                setAddingStation(null);
                              }}
                              className="rounded-lg border border-line px-2.5 py-1 text-[10px] text-ink transition-colors hover:border-ink hover:bg-surface"
                            >
                              تنظیم ساعت
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onToggle(station, d);
                                setAddingStation(null);
                              }}
                              className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-[10px] text-red-600 transition-colors hover:border-red-400 hover:bg-red-50"
                            >
                              <Ban className="h-3 w-3" strokeWidth={1.8} />
                              تعطیل
                            </button>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setAddingStation(null)}
                        className="text-[11px] text-ink-muted hover:text-ink"
                      >
                        انصراف
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingStation(station)}
                      className="flex items-center gap-1.5 rounded-full border border-dashed border-line/70 px-3 py-2 text-[11px] text-ink-muted transition-colors hover:border-ink hover:text-ink"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                      افزودن روز با تنظیمات جداگانه
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <Button onClick={onSave} disabled={loading}>
            <Check className="h-4 w-4" strokeWidth={1.8} />
            {loading ? "در حال ذخیره..." : "ذخیره زمان‌بندی"}
          </Button>
          {status && (
            <span
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted"
              role="status"
              aria-live="polite"
            >
              <Check className="h-4 w-4 text-emerald-700" strokeWidth={1.8} />
              {status}
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}

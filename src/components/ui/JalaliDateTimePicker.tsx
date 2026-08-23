"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
} from "lucide-react";

interface JalaliDateTimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showTime?: boolean;
  minValue?: string;
  maxValue?: string;
}

interface JalaliDateParts {
  year: number;
  month: number;
  day: number;
}

const jalaliPartsFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  calendar: "persian",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const jalaliMonthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  calendar: "persian",
  year: "numeric",
  month: "long",
});
const jalaliDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  calendar: "persian",
  year: "numeric",
  month: "long",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("fa-IR", {
  hour: "2-digit",
  minute: "2-digit",
});
const dayNumberFormatter = new Intl.NumberFormat("fa-IR", {
  useGrouping: false,
});
const weekdays = [
  { short: "ش", full: "شنبه" },
  { short: "ی", full: "یکشنبه" },
  { short: "د", full: "دوشنبه" },
  { short: "س", full: "سه‌شنبه" },
  { short: "چ", full: "چهارشنبه" },
  { short: "پ", full: "پنجشنبه" },
  { short: "ج", full: "جمعه" },
];

function parseLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!match) return new Date();

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour ? Number(hour) : 0,
    minute ? Number(minute) : 0,
  );
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return new Date();
  }
  return date;
}

function toLocalValue(date: Date, showTime: boolean) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (!showTime) return `${year}-${month}-${day}`;

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function getJalaliParts(date: Date): JalaliDateParts {
  const parts = jalaliPartsFormatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, Number(part.value)]));
  return {
    year: values.get("year") ?? 0,
    month: values.get("month") ?? 0,
    day: values.get("day") ?? 0,
  };
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function monthStartFor(date: Date) {
  const target = getJalaliParts(date);
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);

  for (let index = 0; index < 32; index += 1) {
    const parts = getJalaliParts(result);
    if (parts.year === target.year && parts.month === target.month && parts.day === 1) {
      return result;
    }
    result.setDate(result.getDate() - 1);
  }

  return result;
}

function sameLocalDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatNumber(value: number) {
  return dayNumberFormatter.format(value);
}

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - "۰".charCodeAt(0)))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - "٠".charCodeAt(0)));
}

function isDateWithinBounds(date: Date, minimumDate: Date | null, maximumDate: Date | null) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (minimumDate) {
    const minimumDay = new Date(
      minimumDate.getFullYear(),
      minimumDate.getMonth(),
      minimumDate.getDate(),
    );
    if (dayStart < minimumDay) return false;
  }
  if (maximumDate) {
    const maximumDay = new Date(
      maximumDate.getFullYear(),
      maximumDate.getMonth(),
      maximumDate.getDate(),
    );
    if (dayStart > maximumDay) return false;
  }
  return true;
}

function TimeSegment({
  label,
  value,
  maximum,
  onChange,
}: {
  label: string;
  value: number;
  maximum: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(value).padStart(2, "0"));

  const change = (amount: number) => {
    onChange((value + amount + maximum + 1) % (maximum + 1));
  };

  const commit = () => {
    const normalized = normalizeDigits(draft);
    if (!/^\d{1,2}$/.test(normalized)) {
      setDraft(String(value).padStart(2, "0"));
      return;
    }
    const next = Number(normalized);
    if (next > maximum) {
      setDraft(String(value).padStart(2, "0"));
      return;
    }
    onChange(next);
    setDraft(String(next).padStart(2, "0"));
  };

  return (
    <div className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-line bg-white/65 px-2 py-1.5">
      <span className="text-[10px] text-ink-muted">{label}</span>
      <div className="flex items-center gap-1.5" dir="ltr">
        <button
          type="button"
          onClick={() => change(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-label={`کاهش ${label}`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={draft}
          onChange={(event) => setDraft(normalizeDigits(event.target.value).slice(0, 2))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              change(1);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              change(-1);
            }
          }}
          aria-label={label}
          className="h-8 w-9 rounded-lg bg-transparent text-center text-base font-bold tabular-nums text-ink outline-none focus:bg-accent-soft"
        />
        <button
          type="button"
          onClick={() => change(1)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-label={`افزایش ${label}`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function JalaliDateTimePicker({
  label,
  value,
  onChange,
  showTime = true,
  minValue,
  maxValue,
}: JalaliDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseLocalDateTime(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDate = useMemo(() => parseLocalDateTime(value), [value]);
  const minimumDate = useMemo(
    () => (minValue ? parseLocalDateTime(minValue) : null),
    [minValue],
  );
  const maximumDate = useMemo(
    () => (maxValue ? parseLocalDateTime(maxValue) : null),
    [maxValue],
  );
  const monthStart = useMemo(() => monthStartFor(viewDate), [viewDate]);
  const viewParts = getJalaliParts(monthStart);
  const monthCells = useMemo(() => {
    const firstWeekday = (monthStart.getDay() + 1) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(monthStart, index - firstWeekday);
      const parts = getJalaliParts(date);
      return {
        date,
        day: parts.day,
        inMonth: parts.year === viewParts.year && parts.month === viewParts.month,
        allowed: isDateWithinBounds(date, minimumDate, maximumDate),
      };
    });
  }, [maximumDate, minimumDate, monthStart, viewParts.month, viewParts.year]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const updateDate = (date: Date) => {
    const next = new Date(date);
    next.setHours(
      showTime ? selectedDate.getHours() : 0,
      showTime ? selectedDate.getMinutes() : 0,
      0,
      0,
    );
    onChange(toLocalValue(next, showTime));
    setViewDate(next);
    setOpen(false);
  };

  const updateTime = (part: "hours" | "minutes", value: number) => {
    const next = new Date(selectedDate);
    next.setSeconds(0, 0);
    if (part === "hours") next.setHours(value);
    else next.setMinutes(value);
    onChange(toLocalValue(next, true));
  };

  const setCurrent = () => {
    const now = new Date();
    if (!isDateWithinBounds(now, minimumDate, maximumDate)) return;
    onChange(toLocalValue(now, showTime));
    setViewDate(now);
  };

  const shiftMonth = (direction: -1 | 1) => {
    const anchor = addDays(monthStart, direction === 1 ? 35 : -1);
    setViewDate(monthStartFor(anchor));
  };

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${jalaliDateFormatter.format(selectedDate)}${
          showTime ? `، ${timeFormatter.format(selectedDate)}` : ""
        }`}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-xl border border-line bg-white/70 px-3.5 py-2.5 text-right text-sm text-ink transition-colors hover:border-ink/30 focus:border-accent/60 focus:outline-none focus-visible:ring-3 focus-visible:ring-accent/10"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-accent" />
        <span className="min-w-0 flex-1 truncate">{jalaliDateFormatter.format(selectedDate)}</span>
        {showTime && (
          <span dir="ltr" className="shrink-0 text-xs text-ink-muted">
            {timeFormatter.format(selectedDate)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${label}؛ تقویم جلالی`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
            }
          }}
          className="absolute inset-x-0 top-full z-20 mt-2 rounded-2xl border border-line bg-panel p-3 shadow-xl"
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              aria-label="ماه قبل"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-ink">{jalaliMonthFormatter.format(monthStart)}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-ink/5 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
              aria-label="ماه بعد"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center" aria-label="روزهای هفته">
            {weekdays.map((weekday) => (
              <span
                key={weekday.full}
                title={weekday.full}
                className="py-1 text-[10px] font-medium text-ink-muted"
              >
                {weekday.short}
              </span>
            ))}
            {monthCells.map(({ date, day, inMonth, allowed }) => {
              const selected = inMonth && sameLocalDate(date, selectedDate);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={!inMonth || !allowed}
                  aria-label={jalaliDateFormatter.format(date)}
                  aria-current={selected ? "date" : undefined}
                  onClick={() => updateDate(date)}
                  className={`flex h-8 items-center justify-center rounded-lg text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${
                    selected
                      ? "bg-ink font-bold text-paper"
                      : inMonth && allowed
                        ? "text-ink hover:bg-accent-soft"
                        : "cursor-default text-ink-muted/25"
                  }`}
                >
                  {formatNumber(day)}
                </button>
              );
            })}
          </div>

          {showTime ? (
            <div className="mt-3 border-t border-line/70 pt-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-ink-muted">
                  <Clock3 className="h-3.5 w-3.5" />
                  زمان
                </span>
                <button
                  type="button"
                  onClick={setCurrent}
                  disabled={!isDateWithinBounds(new Date(), minimumDate, maximumDate)}
                  className="rounded-lg px-2 py-1 text-[10px] font-medium text-accent hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  اکنون
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2" dir="ltr">
                <TimeSegment
                  key={`hours-${selectedDate.getHours()}`}
                  label="ساعت"
                  value={selectedDate.getHours()}
                  maximum={23}
                  onChange={(value) => updateTime("hours", value)}
                />
                <span className="text-base font-bold text-ink-muted">:</span>
                <TimeSegment
                  key={`minutes-${selectedDate.getMinutes()}`}
                  label="دقیقه"
                  value={selectedDate.getMinutes()}
                  maximum={59}
                  onChange={(value) => updateTime("minutes", value)}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={setCurrent}
              disabled={!isDateWithinBounds(new Date(), minimumDate, maximumDate)}
              className="mt-3 flex w-full items-center justify-center border-t border-line/70 pt-3 text-[10px] font-medium text-accent hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              امروز
            </button>
          )}
        </div>
      )}
    </div>
  );
}

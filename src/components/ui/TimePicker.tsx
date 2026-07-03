"use client";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export function TimePicker({ value, onChange, className = "" }: TimePickerProps) {
  const [h, m] = (value || "07:00").split(":");

  return (
    <div dir="ltr" className={`flex items-center gap-0.5 ${className}`}>
      <select
        value={h}
        onChange={(e) => onChange(`${e.target.value}:${m}`)}
        className="w-14 rounded-lg border border-line bg-surface px-1 py-1 text-xs text-ink text-center focus:border-ink focus:outline-none appearance-none"
      >
        {HOURS.map((hour) => (
          <option key={hour} value={hour}>{hour}</option>
        ))}
      </select>
      <span className="text-xs text-ink-muted">:</span>
      <select
        value={m}
        onChange={(e) => onChange(`${h}:${e.target.value}`)}
        className="w-14 rounded-lg border border-line bg-surface px-1 py-1 text-xs text-ink text-center focus:border-ink focus:outline-none appearance-none"
      >
        {MINUTES.map((min) => (
          <option key={min} value={min}>{min}</option>
        ))}
      </select>
    </div>
  );
}

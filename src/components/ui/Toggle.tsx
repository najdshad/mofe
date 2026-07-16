"use client";

interface ToggleProps {
  on: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Toggle({ on, onChange, disabled, "aria-label": ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={`relative h-6 w-11 rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        on ? "border-ink bg-ink" : "border-line bg-transparent"
      }`}
    >
      <div
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow-sm transition-all duration-150 ${
          on ? "left-[calc(100%-22px)]" : "left-0.5"
        }`}
      />
    </button>
  );
}

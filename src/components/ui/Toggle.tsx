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
      className={`relative h-6 w-10 rounded-full border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        on ? "border-success bg-success" : "border-line bg-white"
      }`}
    >
      <div
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all duration-150 ${
          on ? "left-[calc(100%-20px)]" : "left-0.5"
        }`}
      />
    </button>
  );
}

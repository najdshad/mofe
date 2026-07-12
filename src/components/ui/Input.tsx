import { forwardRef, useId } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
        >
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className={`w-full rounded-[var(--radius-control)] border bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 transition-colors focus:border-ink focus:outline-none ${
            error ? "border-red-500" : "border-line"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-ink-muted">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

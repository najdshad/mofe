"use client";

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
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;
    const describedBy = error ? errorId : helperText ? helperId : undefined;
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-ink-muted"
        >
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`w-full rounded-[var(--radius-control)] border bg-white/70 px-3.5 py-2.5 text-sm text-ink shadow-[0_1px_0_rgba(17,17,17,0.02)] placeholder:text-ink-muted/45 transition-colors focus:border-accent/60 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent/10 ${
            error ? "border-red-500" : "border-line"
          } ${className}`}
          {...props}
        />
        {error && <p id={errorId} className="text-xs text-red-600" role="alert">{error}</p>}
        {helperText && !error && (
          <p id={helperId} className="text-xs text-ink-muted">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

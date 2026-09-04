"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "destructive" | "none";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<Variant, string> = {
  primary: "border border-accent bg-accent text-accent-ink shadow-[0_1px_1px_rgba(17,17,17,0.12)] hover:brightness-95",
  secondary: "border border-line bg-control text-ink hover:border-ink/40 hover:bg-control-hover",
  tertiary: "border border-transparent bg-transparent text-ink-muted hover:bg-control hover:text-ink",
  destructive: "border border-danger/35 bg-danger-soft text-danger hover:border-danger/55 hover:brightness-95",
  none: "",
};

const sizeStyles = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-12 px-5 py-2.5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

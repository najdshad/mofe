"use client";

import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "tertiary" | "destructive" | "none";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:opacity-90 border border-ink",
  secondary: "bg-transparent text-ink border border-line hover:border-ink",
  tertiary: "bg-transparent text-ink-muted hover:text-ink border border-transparent",
  destructive: "bg-transparent text-ink border border-line hover:border-ink hover:text-ink",
  none: "",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-full transition-all duration-150 ${variantStyles[variant]} ${sizeStyles[size]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

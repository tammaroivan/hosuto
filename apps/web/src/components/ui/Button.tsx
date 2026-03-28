import type React from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-bg font-bold hover:brightness-110 active:scale-95",
  secondary:
    "bg-surface border border-border text-text-secondary hover:text-white hover:border-text-secondary",
  ghost:
    "text-text-muted hover:text-white",
  danger:
    "bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20",
  accent:
    "bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-[11px] rounded-lg",
  md: "px-4 py-1.5 text-xs rounded-lg",
  lg: "px-4 py-2 text-[11px] rounded-lg",
};

export const Button = ({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-40 disabled:pointer-events-none",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

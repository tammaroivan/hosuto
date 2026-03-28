import type React from "react";
import { cn } from "../../lib/cn";

type BadgeVariant = "success" | "danger" | "warning" | "primary" | "neutral";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-success/10 border-success/20 text-success",
  danger: "bg-danger/10 border-danger/20 text-danger",
  warning: "bg-warning/10 border-warning/20 text-warning",
  primary: "bg-primary/10 border-primary/20 text-primary",
  neutral: "bg-surface border-border text-text-secondary",
};

const dotColors: Record<BadgeVariant, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  primary: "bg-primary",
  neutral: "bg-text-muted",
};

export const Badge = ({
  variant = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
};

export const TagBadge = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded bg-surface border border-border/50 px-1.5 py-0.5 text-[9px] font-mono text-text-secondary",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};

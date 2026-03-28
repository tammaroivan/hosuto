import { cn } from "../../lib/cn";

type StatusDotVariant = "success" | "danger" | "warning" | "primary" | "neutral";
type StatusDotSize = "sm" | "md" | "lg";

interface StatusDotProps {
  variant: StatusDotVariant;
  size?: StatusDotSize;
  pulse?: boolean;
  ring?: boolean;
  className?: string;
}

const colorStyles: Record<StatusDotVariant, string> = {
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  primary: "bg-primary",
  neutral: "bg-text-muted",
};

const ringStyles: Record<StatusDotVariant, string> = {
  success: "ring-4 ring-success/10",
  danger: "ring-4 ring-danger/10",
  warning: "ring-4 ring-warning/10",
  primary: "ring-4 ring-primary/10",
  neutral: "ring-4 ring-white/5",
};

const sizeStyles: Record<StatusDotSize, string> = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2.5 w-2.5",
};

export const StatusDot = ({
  variant,
  size = "md",
  pulse = false,
  ring = false,
  className,
}: StatusDotProps) => {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full",
        colorStyles[variant],
        sizeStyles[size],
        pulse && "pulse-dot",
        ring && ringStyles[variant],
        className,
      )}
    />
  );
};

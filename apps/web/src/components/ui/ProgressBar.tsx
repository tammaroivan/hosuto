import { cn } from "../../lib/cn";

type ProgressVariant = "primary" | "success" | "danger" | "warning";

interface ProgressBarProps {
  value: number;
  variant?: ProgressVariant;
  className?: string;
}

const barColors: Record<ProgressVariant, string> = {
  primary: "bg-primary",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
};

export const ProgressBar = ({ value, variant = "primary", className }: ProgressBarProps) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("h-1 rounded-full bg-surface overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all", barColors[variant])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

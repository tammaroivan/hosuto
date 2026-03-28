import { cn } from "../lib/cn";

type StatVariant = "success" | "danger" | "warning" | "primary" | "neutral";

interface StatCardProps {
  label: string;
  value: string | number;
  variant?: StatVariant;
  icon?: React.ReactNode;
  progress?: number;
  progressColor?: string;
  className?: string;
}

const valueColors: Record<StatVariant, string> = {
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  primary: "text-primary",
  neutral: "text-text-primary",
};

export const StatCard = ({
  label,
  value,
  variant = "neutral",
  icon,
  progress,
  progressColor,
  className,
}: StatCardProps) => {
  return (
    <div className={cn("blur-panel rounded-2xl p-4 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          {label}
        </span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <span className={cn("text-2xl font-bold tracking-tight", valueColors[variant])}>
        {value}
      </span>
      {progress !== undefined && (
        <div className="h-1 rounded-full bg-surface overflow-hidden">
          <div
            className={cn("h-full rounded-full", progressColor ?? "bg-primary")}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
};

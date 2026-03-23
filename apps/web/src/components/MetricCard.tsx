const VARIANT_COLORS: Record<string, string> = {
  success: "text-accent-green",
  danger: "text-accent-rose",
  info: "text-accent-cyan",
  neutral: "text-text-muted",
};

export const MetricCard = ({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "danger" | "info" | "neutral";
}) => {
  const color = VARIANT_COLORS[variant] || VARIANT_COLORS.neutral;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-hover">
      <span className="text-xs font-medium uppercase tracking-[0.1em] text-white/70">{label}</span>
      <span
        className={`mt-2 text-5xl font-bold tracking-tighter leading-none tabular-nums ${color}`}
      >
        {String(value).padStart(2, "0")}
      </span>
    </div>
  );
};

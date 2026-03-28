import { formatMB } from "../lib/format";
import { Text } from "./ui/text";

interface MetricsStripProps {
  stackCount: number;
  containerCount: number;
  runningCount: number;
  updatesCount: number;
  cpuPercent: number;
  memoryUsage: number;
}

export const MetricsStrip = ({
  stackCount,
  containerCount,
  runningCount,
  updatesCount,
  cpuPercent,
  memoryUsage,
}: MetricsStripProps) => {
  return (
    <div className="flex items-center gap-6 overflow-x-auto border-b border-border/20 px-6 py-2 blur-panel-dark">
      <MetricItem label="Stacks" value={`${stackCount} stacks`} color="accent" />
      <Sep />
      <MetricItem
        label="Containers"
        value={`${containerCount} total · ${runningCount} running`}
        color="success"
      />
      <Sep />
      {updatesCount > 0 ? (
        <MetricItem label="Updates" value={`${updatesCount} available`} color="warning" />
      ) : (
        <MetricItem label="Updates" value="All up to date" color="success" />
      )}
      <Sep />
      <MetricItem label="CPU" value={`${cpuPercent.toFixed(1)}%`} color="accent" />
      <Sep />
      <MetricItem label="RAM" value={formatMB(memoryUsage)} color="warning" />
    </div>
  );
};

const MetricItem = ({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "accent" | "success" | "warning";
}) => (
  <div className="flex shrink-0 items-center gap-2">
    <Text.Label>{label}</Text.Label>
    <Text size="xs" mono color={color}>
      {value}
    </Text>
  </div>
);

const Sep = () => <div className="h-3 w-px bg-border" />;

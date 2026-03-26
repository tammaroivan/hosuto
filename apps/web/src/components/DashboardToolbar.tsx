import { Plus, RefreshCw } from "lucide-react";
import { MetricCard } from "./MetricCard";

interface DashboardToolbarProps {
  running: number;
  stopped: number;
  containerCount: number;
  stackCount: number;
  isFetching: boolean;
  onCreateStack: () => void;
  onRefresh: () => void;
}

export const DashboardToolbar = ({
  running,
  stopped,
  containerCount,
  stackCount,
  isFetching,
  onCreateStack,
  onRefresh,
}: DashboardToolbarProps) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Running" value={running} variant="success" />
        <MetricCard label="Alerts" value={stopped} variant={stopped > 0 ? "danger" : "neutral"} />
        <MetricCard label="Containers" value={containerCount} variant="info" />
        <MetricCard label="Stacks" value={stackCount} variant="neutral" />
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={onCreateStack}
          title="Create new stack"
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-sm font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
        >
          <Plus size={14} />
          New Stack
        </button>
        <button
          onClick={onRefresh}
          title="Re-scan stacks directory"
          className="rounded-md border border-border px-2.5 py-2.5 text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
};

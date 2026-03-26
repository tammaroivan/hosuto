import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { useHealth } from "../hooks/useHealth";
import { useStacks } from "../hooks/useStacks";
import { MetricCard } from "../components/MetricCard";
import { StackSection } from "../components/StackSection";
import { CreateStackDialog } from "../components/CreateStackDialog";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const health = useHealth();
  const stacks = useStacks();
  const [createOpen, setCreateOpen] = React.useState(false);

  const { allContainers, running, stopped } = React.useMemo(() => {
    const containers = stacks.data?.flatMap(stack => stack.containers) || [];
    const runningCount = stacks.data?.reduce((sum, stack) => sum + stack.status.running, 0) ?? 0;
    const expectedCount = stacks.data?.reduce((sum, stack) => sum + stack.status.expected, 0) ?? 0;

    return {
      allContainers: containers,
      running: runningCount,
      stopped: expectedCount - runningCount,
    };
  }, [stacks.data]);

  return (
    <div className="space-y-6">
      {health.isLoading && <p className="text-text-muted">Connecting to server...</p>}
      {health.isError && <p className="text-accent-rose">Failed to connect to server.</p>}

      {stacks.isError && (
        <div className="rounded-xl border border-accent-rose/30 bg-accent-rose/5 p-4">
          <p className="font-medium text-accent-rose">Failed to load stacks</p>
          <p className="mt-1 text-sm text-accent-rose/80">
            Could not connect to Docker. Is the Docker socket accessible?
          </p>
        </div>
      )}

      {stacks.data && (
        <div className="flex items-start justify-between gap-4">
          <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Running" value={running} variant="success" />
            <MetricCard
              label="Alerts"
              value={stopped}
              variant={stopped > 0 ? "danger" : "neutral"}
            />
            <MetricCard label="Containers" value={allContainers.length} variant="info" />
            <MetricCard label="Stacks" value={stacks.data.length} variant="neutral" />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCreateOpen(true)}
              title="Create new stack"
              className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-sm font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
            >
              <Plus size={14} />
              New Stack
            </button>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["stacks"] })}
              title="Re-scan stacks directory"
              className="rounded-md border border-border px-2.5 py-2.5 text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
            >
              <RefreshCw size={14} className={stacks.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      )}

      {stacks.isLoading && <p className="text-text-muted">Loading stacks...</p>}
      {stacks.data && stacks.data.length === 0 && !stacks.isError && (
        <p className="text-text-muted">No stacks found. Mount your compose files directory.</p>
      )}

      <div className="space-y-10">
        {stacks.data?.map(stack => (
          <StackSection key={stack.name} stack={stack} />
        ))}
      </div>

      {createOpen && <CreateStackDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Dashboard,
});

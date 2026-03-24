import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useHealth } from "../hooks/useHealth";
import { useStacks } from "../hooks/useStacks";
import { MetricCard } from "../components/MetricCard";
import { StackSection } from "../components/StackSection";

const Dashboard = () => {
  const health = useHealth();
  const stacks = useStacks();

  const { allContainers, running, stopped } = React.useMemo(() => {
    const containers = stacks.data?.flatMap(stack => stack.containers) || [];
    const runningContainers = containers.filter(container => container.state === "running").length;

    return {
      allContainers: containers,
      running: runningContainers,
      stopped: containers.length - runningContainers,
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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <MetricCard label="Running" value={running} variant="success" />
            <MetricCard
              label="Alerts"
              value={stopped}
              variant={stopped > 0 ? "danger" : "neutral"}
            />
            <MetricCard label="Containers" value={allContainers.length} variant="info" />
            <MetricCard label="Stacks" value={stacks.data.length} variant="neutral" />
          </div>
        </>
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
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Dashboard,
});

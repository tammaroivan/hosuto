import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useHealth } from "../hooks/useHealth";
import { useStacks } from "../hooks/useStacks";
import { useContainerStats } from "../hooks/useContainerStats";
import { CommandBar } from "../components/CommandBar";
import { MetricsStrip } from "../components/MetricsStrip";
import { StackRow } from "../components/StackRow";
import { CreateStackDialog } from "../components/CreateStackDialog";
import { EmptyState } from "../components/EmptyState";
import { Text } from "../components/ui/text";

const Dashboard = () => {
  const health = useHealth();
  const stacks = useStacks();
  const stats = useContainerStats();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { containerCount, runningCount, updatesCount } = React.useMemo(() => {
    if (!stacks.data) {
      return { containerCount: 0, runningCount: 0, updatesCount: 0 };
    }

    const containers = stacks.data.flatMap(stack => stack.containers);
    const running = stacks.data.reduce((sum, stack) => sum + stack.status.running, 0);
    const updates = stacks.data.filter(stack => stack.updates?.hasUpdates).length;
    return { containerCount: containers.length, runningCount: running, updatesCount: updates };
  }, [stacks.data]);

  const filteredStacks = React.useMemo(() => {
    if (!stacks.data) {
      return [];
    }

    const query = search.toLowerCase().trim();
    if (!query) {
      return stacks.data;
    }

    return stacks.data.filter(
      stack =>
        stack.name.toLowerCase().includes(query) ||
        stack.containers.some(
          container =>
            container.name.toLowerCase().includes(query) ||
            container.image.toLowerCase().includes(query),
        ),
    );
  }, [stacks.data, search]);

  return (
    <>
      <CommandBar
        search={search}
        onSearchChange={setSearch}
        onCreateStack={() => setCreateOpen(true)}
      />

      <MetricsStrip
        stackCount={stacks.data?.length ?? 0}
        containerCount={containerCount}
        runningCount={runningCount}
        updatesCount={updatesCount}
        cpuPercent={stats?.totals.cpuPercent ?? 0}
        memoryUsage={stats?.totals.memoryUsage ?? 0}
      />

      <main className="custom-scroll flex-1 space-y-3 overflow-y-auto p-6">
        {health.isLoading && (
          <Text as="p" color="secondary">
            Connecting to server...
          </Text>
        )}
        {health.isError && (
          <Text as="p" color="danger">
            Failed to connect to server.
          </Text>
        )}

        {stacks.isError && (
          <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
            <Text as="p" weight="medium" color="danger">
              Failed to load stacks
            </Text>
            <Text as="p" color="danger" className="mt-1 opacity-80">
              Could not connect to Docker. Is the Docker socket accessible?
            </Text>
          </div>
        )}

        {stacks.isLoading && (
          <Text as="p" color="secondary">
            Loading stacks...
          </Text>
        )}
        {stacks.data && stacks.data.length === 0 && !stacks.isError && (
          <EmptyState onCreateStack={() => setCreateOpen(true)} />
        )}

        {filteredStacks.map(stack => (
          <StackRow key={stack.name} stack={stack} containerStats={stats?.containers} />
        ))}

        {stacks.data && filteredStacks.length === 0 && stacks.data.length > 0 && (
          <Text as="p" color="secondary">
            No stacks match your search.
          </Text>
        )}
      </main>

      {createOpen && <CreateStackDialog onClose={() => setCreateOpen(false)} />}
    </>
  );
};

export const Route = createFileRoute("/")({
  component: Dashboard,
});

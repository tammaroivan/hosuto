import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { StackState } from "@hosuto/shared";
import { useHealth } from "../hooks/useHealth";
import { useStacks } from "../hooks/useStacks";
import { DashboardToolbar } from "../components/DashboardToolbar";
import { SearchBar } from "../components/SearchBar";
import { StackSection } from "../components/StackSection";
import { CreateStackDialog } from "../components/CreateStackDialog";

const Dashboard = () => {
  const queryClient = useQueryClient();
  const health = useHealth();
  const stacks = useStacks();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StackState | null>(null);

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

  const filteredStacks = React.useMemo(() => {
    if (!stacks.data) {
      return [];
    }

    const query = search.toLowerCase().trim();

    return stacks.data.filter(stack => {
      if (statusFilter && stack.status.state !== statusFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      if (stack.name.toLowerCase().includes(query)) {
        return true;
      }

      return stack.containers.some(
        container =>
          container.name.toLowerCase().includes(query) ||
          container.image.toLowerCase().includes(query),
      );
    });
  }, [stacks.data, search, statusFilter]);

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
        <DashboardToolbar
          running={running}
          stopped={stopped}
          containerCount={allContainers.length}
          stackCount={stacks.data.length}
          isFetching={stacks.isFetching}
          onCreateStack={() => setCreateOpen(true)}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["stacks"] })}
        />
      )}

      {stacks.isLoading && <p className="text-text-muted">Loading stacks...</p>}
      {stacks.data && stacks.data.length === 0 && !stacks.isError && (
        <p className="text-text-muted">No stacks found. Mount your compose files directory.</p>
      )}

      {stacks.data && stacks.data.length > 0 && (
        <SearchBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      )}

      <div className="space-y-10">
        {filteredStacks.map(stack => (
          <StackSection key={stack.entrypoint} stack={stack} />
        ))}
        {stacks.data && filteredStacks.length === 0 && stacks.data.length > 0 && (
          <p className="text-sm text-text-muted">No stacks match your search.</p>
        )}
      </div>

      {createOpen && <CreateStackDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Dashboard,
});

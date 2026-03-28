import { createFileRoute } from "@tanstack/react-router";
import { Box, Cpu, Database, ArrowUpDown, Clock } from "lucide-react";
import { useStacks } from "../hooks/useStacks";
import { useContainerStats } from "../hooks/useContainerStats";
import { formatMB } from "../lib/format";
import { Text } from "../components/ui/text";
import { StatCard } from "../components/StatCard";
import { ContainersTable } from "../components/ContainersTable";

const StackOverview = () => {
  const { stackName } = Route.useParams();
  const stacks = useStacks();
  const stats = useContainerStats();

  const stack = stacks.data?.find(stack => stack.name === stackName);

  if (!stack) {
    return null;
  }

  const stackCpu = stats
    ? stack.containers.reduce(
        (sum, container) => sum + (stats.containers[container.id]?.cpuPercent ?? 0),
        0,
      )
    : 0;

  const stackMemory = stats
    ? stack.containers.reduce(
        (sum, container) => sum + (stats.containers[container.id]?.memoryUsage ?? 0),
        0,
      )
    : 0;

  return (
    <div className="custom-scroll flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-6 px-8 py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Containers"
            value={`${stack.status.running}/${stack.status.expected}`}
            variant="primary"
            icon={<Box size={16} />}
            progress={(stack.status.running / Math.max(stack.status.expected, 1)) * 100}
            progressColor="bg-primary"
          />
          <StatCard
            label="CPU Usage"
            value={`${stackCpu.toFixed(1)}%`}
            icon={<Cpu size={16} />}
            progress={stackCpu}
            progressColor="bg-warning"
          />
          <StatCard
            label="Memory"
            value={formatMB(stackMemory)}
            icon={<Database size={16} />}
            variant="success"
          />
          <StatCard label="Network I/O" value="—" icon={<ArrowUpDown size={16} />} />
        </div>

        <div className="blur-panel overflow-hidden rounded-2xl">
          <ContainersTable containers={stack.containers} containerStats={stats?.containers} />
        </div>
      </div>

      {stack.entrypoint && (
        <footer className="mt-auto flex shrink-0 items-center justify-between border-t border-border/20 bg-surface/40 px-8 py-4">
          <div className="flex items-center gap-6">
            <FooterItem label="Entrypoint" value={stack.entrypoint} />
            <div className="h-6 w-px bg-border/40" />
            <FooterItem label="Files" value={`${stack.files.length} compose files`} />
            <div className="h-6 w-px bg-border/40" />
            <FooterItem label="Project" value={stack.name} />
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-text-secondary" />
            <Text size="xs" weight="bold" color="secondary" uppercase>
              Last synced: just now
            </Text>
          </div>
        </footer>
      )}
    </div>
  );
};

const FooterItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <Text size="xs" weight="bold" color="secondary" uppercase>
      {label}
    </Text>
    <Text size="xs" mono color="secondary">
      {value}
    </Text>
  </div>
);

export const Route = createFileRoute("/stacks/$stackName/")({
  component: StackOverview,
});

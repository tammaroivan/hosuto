import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Square, RefreshCw, Terminal, Play, Trash2, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Container } from "@hosuto/shared";
import { api } from "../lib/api";
import { useContainerAction } from "../hooks/useContainerAction";
import { useContainerLogs } from "../hooks/useContainerLogs";
import { STATUS_CONFIG, DEFAULT_STATUS } from "../lib/status";
import { getImageUrl } from "../lib/docker";
import { formatUptime } from "../lib/format";
import { cn } from "../lib/cn";
import { Text } from "../components/ui/text";
import { Breadcrumb } from "../components/Breadcrumb";
import { LogViewer } from "../components/LogViewer";

const TAIL_OPTIONS = [100, 200, 500, 1000, 5000];

const ContainerDetail = () => {
  const { containerId } = Route.useParams();
  const [tail, setTail] = React.useState(500);
  const [logFilter, setLogFilter] = React.useState("");

  const container = useQuery({
    queryKey: ["container", containerId],
    queryFn: async () => {
      const res = await api.containers[":id"].$get({ param: { id: containerId } });
      if (!res.ok) {
        throw new Error("Container not found");
      }

      return res.json() as Promise<Container>;
    },
  });

  const action = useContainerAction();
  const logs = useContainerLogs(containerId, tail);

  const filteredLines = React.useMemo(() => {
    if (!logFilter) {
      return logs.lines;
    }

    const query = logFilter.toLowerCase();
    return logs.lines.filter(line => line.text.toLowerCase().includes(query));
  }, [logs.lines, logFilter]);

  if (container.isLoading) {
    return (
      <main className="flex-1 p-8">
        <Text color="secondary">Loading container...</Text>
      </main>
    );
  }

  if (container.isError || !container.data) {
    return (
      <main className="flex-1 p-8">
        <Text color="danger">Failed to load container.</Text>
      </main>
    );
  }

  const containerData = container.data;
  const isStopped = containerData.state !== "running";
  const status = STATUS_CONFIG[containerData.status] ?? DEFAULT_STATUS;

  const breadcrumbItems = containerData.stackName
    ? [
        { label: "Dashboard", to: "/" },
        {
          label: containerData.stackName,
          to: "/stacks/$stackName",
          params: { stackName: containerData.stackName },
        },
        { label: containerData.name },
      ]
    : [{ label: "Dashboard", to: "/" }, { label: containerData.name }];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-8 pt-8 pb-0 flex flex-col gap-4">
        <Breadcrumb items={breadcrumbItems} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Text as="h1" size="2xl" weight="bold" color="white" className="tracking-tight">
              {containerData.name}
            </Text>
            <div
              className={cn("flex items-center gap-2 rounded-full border px-3 py-1", status.badge)}
            >
              <span className={cn("h-2 w-2 rounded-full pulse-dot", status.dot)} />
              <Text size="xs" weight="bold" uppercase>
                {status.label}
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isStopped ? (
              <ActionBtn
                label="Start"
                className="hover:border-success hover:text-success"
                disabled={action.isPending}
                onClick={() =>
                  action.mutate({ id: containerData.id, name: containerData.name, action: "start" })
                }
              >
                <Play size={14} />
                Start
              </ActionBtn>
            ) : (
              <>
                <ActionBtn
                  label="Stop"
                  className="hover:border-danger hover:text-danger"
                  disabled={action.isPending}
                  onClick={() => {
                    if (
                      containerData.isSelf &&
                      !confirm("This will stop Hosuto. You will lose access to the UI. Continue?")
                    ) {
                      return;
                    }

                    action.mutate({
                      id: containerData.id,
                      name: containerData.name,
                      action: "stop",
                    });
                  }}
                >
                  <Square size={14} />
                  Stop
                </ActionBtn>
                <ActionBtn
                  label="Restart"
                  className="hover:border-primary hover:text-primary"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate({
                      id: containerData.id,
                      name: containerData.name,
                      action: "restart",
                    })
                  }
                >
                  <RefreshCw size={14} />
                  Restart
                </ActionBtn>
                <Link
                  to="/containers/$containerId/exec"
                  params={{ containerId: containerData.id }}
                  className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 text-xs font-bold text-text-secondary transition-all hover:bg-white/5"
                >
                  <Terminal size={14} />
                  Shell
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="blur-panel flex items-center gap-6 rounded-xl px-4 py-2.5">
          <MetadataItem label="Image">
            <a
              href={getImageUrl(containerData.image)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary transition-colors hover:underline"
            >
              {containerData.image}
            </a>
          </MetadataItem>
          {containerData.stackName && (
            <>
              <div className="h-6 w-px bg-border/40" />
              <MetadataItem label="Stack">
                <Link
                  to="/stacks/$stackName"
                  params={{ stackName: containerData.stackName }}
                  className="text-xs font-bold text-white transition-colors hover:text-primary"
                >
                  {containerData.stackName}
                </Link>
              </MetadataItem>
            </>
          )}
          <div className="h-6 w-px bg-border/40" />
          <MetadataItem label="Ports">
            {containerData.ports.length > 0 ? (
              <div className="flex gap-1">
                {containerData.ports.map(port => (
                  <Text
                    key={`${port.hostPort}-${port.containerPort}`}
                    size="xs"
                    mono
                    color="secondary"
                    className="rounded border border-border/50 bg-surface-elevated px-1.5 py-0.5"
                  >
                    {port.hostPort}:{port.containerPort}
                  </Text>
                ))}
              </div>
            ) : (
              <Text size="xs" color="secondary">
                —
              </Text>
            )}
          </MetadataItem>
          <div className="h-6 w-px bg-border/40" />
          <MetadataItem label="Uptime">
            <Text size="xs" mono>
              {containerData.uptime ? formatUptime(containerData.uptime) : "—"}
            </Text>
          </MetadataItem>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-8 pt-4 pb-8">
        <div className="blur-panel flex flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/40 bg-black/20 px-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Text size="xs" weight="bold" color="secondary">
                  TAIL
                </Text>
                <select
                  value={tail}
                  onChange={event => setTail(Number(event.target.value))}
                  className="rounded border border-border/60 bg-surface-elevated px-1.5 py-0.5 text-xs text-text-primary outline-none"
                >
                  {TAIL_OPTIONS.map(lines => (
                    <option key={lines} value={lines}>
                      {lines}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success pulse-dot" />
                <Text size="xs" weight="bold" color="success" uppercase>
                  Live
                </Text>
              </div>
              <button
                onClick={logs.clear}
                className="flex h-7 items-center gap-2 rounded-lg border border-border/60 bg-surface-elevated px-3 text-xs font-bold text-text-secondary transition-all hover:text-white"
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>
            <div className="relative w-64">
              <Search
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                value={logFilter}
                onChange={event => setLogFilter(event.target.value)}
                placeholder="Filter logs..."
                className="w-full rounded-lg border border-border/40 bg-surface-elevated py-1 pl-9 pr-3 font-mono text-xs text-text-primary placeholder:text-text-secondary outline-none focus:border-primary/40"
              />
            </div>
          </div>
          <LogViewer lines={filteredLines} isLoading={logs.isLoading} />
        </div>
      </div>
    </div>
  );
};

const MetadataItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col">
    <Text.Label className="mb-0.5">{label}</Text.Label>
    {children}
  </div>
);

const ActionBtn = ({
  label,
  className,
  disabled,
  onClick,
  children,
}: {
  label: string;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 text-xs font-bold text-text-secondary transition-all disabled:opacity-40",
      className,
    )}
  >
    {children}
  </button>
);

export const Route = createFileRoute("/containers/$containerId")({
  component: ContainerDetail,
});

import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Container } from "@hosuto/shared";
import { api } from "../lib/api";
import { useContainerAction } from "../hooks/useContainerAction";
import { useContainerLogs } from "../hooks/useContainerLogs";
import { STATUS_CONFIG, DEFAULT_STATUS } from "../lib/status";
import { getImageUrl } from "../lib/docker";
import { formatUptime } from "../lib/format";
import { ActionButton } from "../components/ActionButton";
import { LogViewer } from "../components/LogViewer";

const TAIL_OPTIONS = [100, 200, 500, 1000, 5000];

const ContainerDetail = () => {
  const { containerId } = Route.useParams();
  const [tail, setTail] = React.useState(200);

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

  if (container.isLoading) {
    return <p className="text-text-muted">Loading container...</p>;
  }

  if (container.isError || !container.data) {
    return <p className="text-accent-rose">Failed to load container.</p>;
  }

  const containerData = container.data;
  const isStopped = containerData.state !== "running";
  const status = STATUS_CONFIG[containerData.status] || DEFAULT_STATUS;

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.1em] text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={14} />
          Back to dashboard
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-white">{containerData.name}</h1>
            <div className="flex items-center gap-2 rounded border border-border bg-surface px-2.5 py-1">
              <span className={`h-2 w-2 rounded-full ${status.dot}`} />
              <span className={`text-xs font-bold uppercase tracking-[0.1em] ${status.text}`}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isStopped && (
              <Link
                to="/containers/$containerId/exec"
                params={{ containerId: containerData.id }}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
              >
                Shell
              </Link>
            )}
            {isStopped ? (
              <ActionButton
                label="Start"
                className="text-accent-green"
                disabled={action.isPending}
                onClick={() => action.mutate({ id: containerData.id, name: containerData.name, action: "start" })}
              />
            ) : (
              <>
                <ActionButton
                  label="Restart"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: containerData.id, name: containerData.name, action: "restart" })}
                />
                <ActionButton
                  label="Stop"
                  className="text-accent-rose"
                  disabled={action.isPending}
                  onClick={() => action.mutate({ id: containerData.id, name: containerData.name, action: "stop" })}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-2 rounded border border-border bg-surface px-4 py-2">
        <InfoItem label="Image">
          <a
            href={getImageUrl(containerData.image)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-accent-cyan transition-colors hover:text-white"
          >
            {containerData.image}
          </a>
        </InfoItem>
        {containerData.stackName && (
          <InfoItem label="Stack">
            <span className="text-xs font-bold text-white">{containerData.stackName}</span>
          </InfoItem>
        )}
        <InfoItem label="Ports">
          {containerData.ports.length > 0 ? (
            <div className="flex gap-2 font-mono text-xs">
              {containerData.ports.map(port => (
                <span key={`${port.hostPort}-${port.containerPort}-${port.protocol}`}>
                  <span className="text-white">{port.hostPort}</span>
                  <span className="text-text-muted">:{port.containerPort}</span>
                  {port.protocol !== "tcp" && (
                    <span className="text-text-muted">/{port.protocol}</span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </InfoItem>
        <InfoItem label="Uptime">
          <span className="text-xs font-bold text-white">
            {containerData.uptime ? formatUptime(containerData.uptime) : "—"}
          </span>
        </InfoItem>
      </div>

      {containerData.mounts.length > 0 && (
        <div className="shrink-0 overflow-hidden rounded-lg border border-border">
          <div className="border-b border-border bg-surface px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-text-primary">
              Mounts
            </span>
          </div>
          <div className="divide-y divide-border">
            {containerData.mounts.map(mount => (
              <div
                key={mount.destination}
                className="flex items-center gap-4 px-4 py-2 font-mono text-xs"
              >
                <span className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-text-muted">
                  {mount.type}
                </span>
                <span className="min-w-0 truncate text-text-muted">{mount.source}</span>
                <span className="shrink-0 text-text-muted">→</span>
                <span className="min-w-0 truncate text-white">{mount.destination}</span>
                {!mount.rw && <span className="shrink-0 text-yellow-500">RO</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-[#0d0d0f]">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-text-primary">
            Logs
          </span>
          <div className="flex items-center gap-4">
            <select
              value={tail}
              onChange={e => setTail(Number(e.target.value))}
              className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-muted outline-none transition-colors hover:border-border-hover"
            >
              {TAIL_OPTIONS.map(lines => (
                <option key={lines} value={lines}>
                  Last {lines} lines
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" />
              <span className="text-xs uppercase tracking-[0.1em] text-text-muted">Live</span>
            </div>
            <button
              onClick={logs.clear}
              className="text-xs font-bold uppercase tracking-[0.1em] text-text-muted transition-colors hover:text-text-primary"
            >
              Clear
            </button>
          </div>
        </div>
        <LogViewer lines={logs.lines} isLoading={logs.isLoading} />
      </div>
    </div>
  );
};

const InfoItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-medium uppercase tracking-[0.1em] text-text-muted">{label}</span>
    {children}
  </div>
);

export const Route = createFileRoute("/containers/$containerId")({
  component: ContainerDetail,
});

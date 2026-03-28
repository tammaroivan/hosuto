import React from "react";
import { Link } from "@tanstack/react-router";
import { ScrollText, Terminal, Play, RefreshCw, Square } from "lucide-react";
import type { Container, ContainerStats } from "@hosuto/shared";
import { useContainerAction } from "../hooks/useContainerAction";
import { cn } from "../lib/cn";
import { STATUS_CONFIG, DEFAULT_STATUS } from "../lib/status";
import { formatUptime, formatMB } from "../lib/format";
import { Text } from "./ui/text";

interface ContainersTableProps {
  containers: Container[];
  containerStats?: Record<string, ContainerStats>;
}

export const ContainersTable = ({ containers, containerStats }: ContainersTableProps) => {
  const containerAction = useContainerAction();

  if (containers.length === 0) {
    return (
      <div className="px-6 py-3">
        <Text size="xs" color="secondary">
          No containers
        </Text>
      </div>
    );
  }

  return (
    <table className="w-full table-fixed text-left">
      <colgroup>
        <col className="w-[22%]" />
        <col className="w-[14%]" />
        <col className="w-[10%]" />
        <col className="w-[7%]" />
        <col className="w-[9%]" />
        <col className="w-[14%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
      </colgroup>
      <thead>
        <tr className="border-b border-border/20 bg-black/10">
          <th className="px-6 py-3">
            <Text.Label>Container Name</Text.Label>
          </th>
          <th className="px-4 py-3">
            <Text.Label>Image</Text.Label>
          </th>
          <th className="px-4 py-3">
            <Text.Label>Status</Text.Label>
          </th>
          <th className="px-4 py-3">
            <Text.Label>CPU</Text.Label>
          </th>
          <th className="px-4 py-3">
            <Text.Label>Memory</Text.Label>
          </th>
          <th className="px-4 py-3">
            <Text.Label>Ports</Text.Label>
          </th>
          <th className="px-4 py-3">
            <Text.Label>Uptime</Text.Label>
          </th>
          <th className="px-6 py-3 text-right">
            <Text.Label>Actions</Text.Label>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/10">
        {containers.map(container => {
          const status = STATUS_CONFIG[container.status] ?? DEFAULT_STATUS;
          const isPlaceholder = container.status === "not_created";
          const isStopped = container.state !== "running";
          const stats = containerStats?.[container.id];

          return (
            <tr
              key={container.id}
              className={cn("transition-colors hover:bg-primary/5", isStopped && "opacity-60")}
            >
              <td className="px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", status.dot)} />
                  {isPlaceholder ? (
                    <Text size="sm" weight="medium" color="secondary" truncate>
                      {container.name}
                    </Text>
                  ) : (
                    <Link
                      to="/containers/$containerId"
                      params={{ containerId: container.id }}
                      className="truncate text-sm font-medium text-text-primary transition-colors hover:text-primary"
                    >
                      {container.name}
                    </Link>
                  )}
                  {container.isSelf && (
                    <Text
                      size="xs"
                      weight="bold"
                      color="success"
                      className="shrink-0 rounded-full bg-success/10 px-1.5 py-0.5"
                    >
                      Hosuto
                    </Text>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 truncate">
                <Text size="xs" mono color="secondary" truncate>
                  {isPlaceholder ? "—" : container.image}
                </Text>
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-xs font-bold uppercase",
                    status.badge,
                  )}
                >
                  {status.label}
                </span>
              </td>
              <td className="px-4 py-3">
                <Text size="xs" mono>
                  {stats ? `${stats.cpuPercent.toFixed(1)}%` : "—"}
                </Text>
              </td>
              <td className="px-4 py-3">
                <Text size="xs" mono>
                  {stats ? formatMB(stats.memoryUsage) : "—"}
                </Text>
              </td>
              <td className="px-4 py-3">
                <Text size="xs" mono>
                  {container.ports.length > 0
                    ? container.ports
                        .map(port => `${port.hostPort}:${port.containerPort}`)
                        .join(", ")
                    : "—"}
                </Text>
              </td>
              <td className="px-4 py-3">
                <Text size="xs" color="secondary">
                  {container.uptime ? formatUptime(container.uptime) : "—"}
                </Text>
              </td>
              <td className="px-6 py-3 text-right">
                {!isPlaceholder && (
                  <div className="flex items-center justify-end">
                    <ActionIcon
                      label="Logs"
                      to="/containers/$containerId"
                      params={{ containerId: container.id }}
                    />
                    {!isStopped && (
                      <ActionIcon
                        label="Shell"
                        to="/containers/$containerId/exec"
                        params={{ containerId: container.id }}
                      >
                        <Terminal size={14} />
                      </ActionIcon>
                    )}
                    {isStopped ? (
                      <ActionButton
                        label="Start"
                        disabled={containerAction.isPending}
                        className="hover:text-success"
                        onClick={() =>
                          containerAction.mutate({
                            id: container.id,
                            name: container.name,
                            action: "start",
                          })
                        }
                      >
                        <Play size={14} />
                      </ActionButton>
                    ) : (
                      <>
                        <ActionButton
                          label="Restart"
                          disabled={containerAction.isPending}
                          onClick={() =>
                            containerAction.mutate({
                              id: container.id,
                              name: container.name,
                              action: "restart",
                            })
                          }
                        >
                          <RefreshCw size={14} />
                        </ActionButton>
                        <ActionButton
                          label="Stop"
                          disabled={containerAction.isPending}
                          className="hover:text-danger"
                          onClick={() => {
                            if (
                              container.isSelf &&
                              !confirm(
                                "This will stop Hosuto. You will lose access to the UI. Continue?",
                              )
                            ) {
                              return;
                            }

                            containerAction.mutate({
                              id: container.id,
                              name: container.name,
                              action: "stop",
                            });
                          }}
                        >
                          <Square size={14} />
                        </ActionButton>
                      </>
                    )}
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const Tooltip = ({ label }: { label: string }) => (
  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-xs font-bold text-white opacity-0 transition-opacity group-hover/tip:opacity-100">
    {label}
  </span>
);

const ActionIcon = ({
  label,
  to,
  params,
  children,
}: {
  label: string;
  to: "/containers/$containerId" | "/containers/$containerId/exec";
  params: { containerId: string };
  children?: React.ReactNode;
}) => (
  <div className="group/tip relative">
    <Link
      to={to}
      params={params}
      className="flex h-6 w-6 items-center justify-center text-text-muted transition-colors hover:text-primary"
    >
      {children ?? <ScrollText size={14} />}
    </Link>
    <Tooltip label={label} />
  </div>
);

const ActionButton = ({
  label,
  disabled,
  className,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <div className="group/tip relative">
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-6 w-6 items-center justify-center text-text-muted transition-colors hover:text-primary disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
    <Tooltip label={label} />
  </div>
);

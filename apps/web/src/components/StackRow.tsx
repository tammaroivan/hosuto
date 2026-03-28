import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  RefreshCw,
  Download,
  FileEdit,
  MoreHorizontal,
  Play,
  Square,
  Hammer,
  Search,
  ArrowUpCircle,
  Network,
} from "lucide-react";
import type { Stack, ContainerStats } from "@hosuto/shared";
import { useStackAction } from "../hooks/useStackAction";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { cn } from "../lib/cn";
import { formatMB } from "../lib/format";
import { useClickOutside } from "../hooks/useClickOutside";
import { Text } from "./ui/text";
import { ContainersTable } from "./ContainersTable";
import toast from "react-hot-toast";

export const StackRow = ({
  stack,
  containerStats,
}: {
  stack: Stack;
  containerStats?: Record<string, ContainerStats>;
}) => {
  const [expanded, setExpanded] = React.useState(true);
  const stackAction = useStackAction();
  const isStandalone = !stack.entrypoint;
  const isStopped = stack.status.state === "stopped";
  const hasUpdates = stack.updates?.hasUpdates ?? false;

  const triggerCheck = useMutation({
    mutationFn: async () => {
      const res = await api.stacks[":name"]["check-updates"].$post({
        param: { name: stack.name },
      });
      return res.json();
    },
    onSuccess: () => toast.success(`Checking updates for ${stack.name}...`),
  });

  const handleDown = (event: React.MouseEvent) => {
    event.stopPropagation();
    const isSelf = stack.containers.some(container => container.isSelf);
    const message = isSelf
      ? "This will stop Hosuto itself. You will lose access to the UI. Continue?"
      : `Stop and remove all containers in "${stack.name}"?`;
    if (!confirm(message)) {
      return;
    }

    stackAction.mutate({ name: stack.name, action: "down" });
  };

  const statusColor =
    stack.status.state === "running"
      ? "bg-success"
      : stack.status.state === "partial"
        ? "bg-warning"
        : "bg-danger";

  const stoppedCount = stack.status.expected - stack.status.running;
  const countText = `${stack.status.running} up · ${stoppedCount} down`;
  const countColor: "success" | "warning" | "danger" =
    stack.status.state === "running"
      ? "success"
      : stack.status.state === "partial"
        ? "warning"
        : "danger";

  const allPorts = stack.containers.flatMap(container => container.ports);

  const stackCpu = React.useMemo(() => {
    if (!containerStats) {
      return 0;
    }

    return stack.containers.reduce(
      (sum, container) => sum + (containerStats[container.id]?.cpuPercent ?? 0),
      0,
    );
  }, [containerStats, stack.containers]);

  const stackMemoryBytes = React.useMemo(() => {
    if (!containerStats) {
      return 0;
    }

    let used = 0;
    for (const container of stack.containers) {
      const stats = containerStats[container.id];
      if (stats) {
        used += stats.memoryUsage;
      }
    }

    return used;
  }, [containerStats, stack.containers]);

  return (
    <div className="blur-panel rounded-xl transition-all duration-200">
      <div
        className="stack-grid h-14 cursor-pointer gap-4 px-4 transition-colors hover:bg-surface/40"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-center">
          <ChevronRight
            size={16}
            className={cn(
              "text-text-secondary transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />
        </div>

        <div className="flex justify-center">
          <span className={cn("h-2 w-2 rounded-full pulse-dot", statusColor)} />
        </div>

        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <Link
              to="/stacks/$stackName"
              params={{ stackName: stack.name }}
              onClick={event => event.stopPropagation()}
              className="truncate text-sm font-bold tracking-tight text-text-primary transition-colors hover:text-primary"
            >
              {stack.name}
            </Link>
            {hasUpdates && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                title="Update available"
              />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3">
            <Text size="xs" mono color={countColor}>
              {countText}
            </Text>
            <Text size="xs" color="secondary">
              ·
            </Text>
            <Text size="xs" mono color="accent">
              {stackCpu.toFixed(1)}% cpu
            </Text>
            <Text size="xs" color="secondary">
              ·
            </Text>
            <Text size="xs" mono color="warning">
              {formatMB(stackMemoryBytes)} ram
            </Text>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 overflow-hidden">
          {allPorts.length > 0 && (
            <>
              <Network size={12} className="shrink-0 text-text-secondary" />
              <div className="flex gap-1 overflow-hidden">
                {allPorts.slice(0, 3).map(port => (
                  <Text
                    key={`${port.hostPort}-${port.containerPort}`}
                    size="xs"
                    mono
                    color="secondary"
                    className="rounded bg-surface/40 px-1"
                  >
                    {port.hostPort}
                  </Text>
                ))}
                {allPorts.length > 3 && (
                  <Text size="xs" mono color="secondary">
                    +{allPorts.length - 3}
                  </Text>
                )}
              </div>
            </>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-1"
          onClick={event => event.stopPropagation()}
        >
          {isStopped ? (
            <RowIconButton
              label="Up"
              disabled={stackAction.isPending}
              onClick={() => stackAction.mutate({ name: stack.name, action: "up" })}
            >
              <Play size={16} />
            </RowIconButton>
          ) : (
            <RowIconButton
              label="Pull"
              disabled={stackAction.isPending}
              onClick={() => stackAction.mutate({ name: stack.name, action: "pull" })}
            >
              <Download size={16} />
            </RowIconButton>
          )}
          {!isStandalone && (
            <div className="group/tip relative">
              <Link
                to="/stacks/$stackName/edit"
                params={{ stackName: stack.name }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:bg-surface-hover hover:text-white"
              >
                <FileEdit size={16} />
              </Link>
              <Tooltip label="Edit" />
            </div>
          )}
          <OverflowMenu
            isStopped={isStopped}
            hasUpdates={hasUpdates}
            hasBuild={stack.hasBuildDirectives}
            isPending={stackAction.isPending || triggerCheck.isPending}
            onRestart={() => stackAction.mutate({ name: stack.name, action: "restart" })}
            onDown={handleDown}
            onPull={() => stackAction.mutate({ name: stack.name, action: "pull" })}
            onBuild={() => stackAction.mutate({ name: stack.name, action: "build-up" })}
            onUpdate={() =>
              stackAction.mutate({
                name: stack.name,
                action: "update",
                services: stack.updates?.results
                  .filter(result => result.updateAvailable)
                  .map(result => result.service),
              })
            }
            onCheckUpdates={() => triggerCheck.mutate()}
          />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40 bg-surface/20">
          <ContainersTable containers={stack.containers} containerStats={containerStats} />
        </div>
      )}
    </div>
  );
};

const Tooltip = ({ label }: { label: string }) => (
  <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-xs font-bold text-white opacity-0 transition-opacity group-hover/tip:opacity-100">
    {label}
  </span>
);

const RowIconButton = ({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <div className="group/tip relative">
    <button
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:bg-surface-hover hover:text-primary disabled:opacity-40"
    >
      {children}
    </button>
    <Tooltip label={label} />
  </div>
);

const OverflowMenu = ({
  isStopped,
  hasUpdates,
  hasBuild,
  isPending,
  onRestart,
  onDown,
  onPull,
  onBuild,
  onUpdate,
  onCheckUpdates,
}: {
  isStopped: boolean;
  hasUpdates: boolean;
  hasBuild: boolean;
  isPending: boolean;
  onRestart: () => void;
  onDown: (event: React.MouseEvent) => void;
  onPull: () => void;
  onBuild: () => void;
  onUpdate: () => void;
  onCheckUpdates: () => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:bg-surface-hover hover:text-white"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg blur-panel py-1 shadow-xl">
          {isStopped ? (
            <>
              <MenuItem
                icon={<Download size={12} />}
                label="Pull"
                disabled={isPending}
                onClick={() => {
                  onPull();
                  close();
                }}
              />
              {hasBuild && (
                <MenuItem
                  icon={<Hammer size={12} />}
                  label="Build & Up"
                  disabled={isPending}
                  onClick={() => {
                    onBuild();
                    close();
                  }}
                />
              )}
            </>
          ) : (
            <>
              <MenuItem
                icon={<RefreshCw size={12} />}
                label="Restart"
                disabled={isPending}
                onClick={() => {
                  onRestart();
                  close();
                }}
              />
              <MenuItem
                icon={<Square size={12} />}
                label="Down"
                danger
                disabled={isPending}
                onClick={event => {
                  onDown(event);
                  close();
                }}
              />
              {hasBuild && (
                <MenuItem
                  icon={<Hammer size={12} />}
                  label="Build"
                  disabled={isPending}
                  onClick={() => {
                    onBuild();
                    close();
                  }}
                />
              )}
            </>
          )}
          <div className="mx-2 my-1 h-px bg-border/20" />
          {hasUpdates ? (
            <MenuItem
              icon={<ArrowUpCircle size={12} />}
              label="Update"
              accent
              disabled={isPending}
              onClick={() => {
                onUpdate();
                close();
              }}
            />
          ) : (
            <MenuItem
              icon={<Search size={12} />}
              label="Check Updates"
              disabled={isPending}
              onClick={() => {
                onCheckUpdates();
                close();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

const MenuItem = ({
  icon,
  label,
  danger,
  accent,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  accent?: boolean;
  disabled?: boolean;
  onClick: (event: React.MouseEvent) => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex w-full items-center gap-2 px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40",
      danger
        ? "text-text-secondary hover:text-danger hover:bg-surface-hover"
        : accent
          ? "text-text-secondary hover:text-primary hover:bg-surface-hover"
          : "text-text-secondary hover:text-white hover:bg-surface-hover",
    )}
  >
    {icon}
    {label.toUpperCase()}
  </button>
);

import React from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  RefreshCw,
  Download,
  MoreHorizontal,
  Play,
  Square,
  Hammer,
  Search,
  ArrowUpCircle,
} from "lucide-react";
import { useStacks } from "../hooks/useStacks";
import { useStackAction } from "../hooks/useStackAction";
import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { cn } from "../lib/cn";
import { Text } from "../components/ui/text";
import { Breadcrumb } from "../components/Breadcrumb";
import { TabBar } from "../components/TabBar";
import toast from "react-hot-toast";

const StackLayout = () => {
  const { stackName } = Route.useParams();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const stacks = useStacks();
  const stackAction = useStackAction();

  const stack = stacks.data?.find(stack => stack.name === stackName);

  const triggerCheck = useMutation({
    mutationFn: async () => {
      const res = await api.stacks[":name"]["check-updates"].$post({
        param: { name: stackName },
      });
      return res.json();
    },
    onSuccess: () => toast.success(`Checking updates for ${stackName}...`),
  });

  if (stacks.isLoading) {
    return (
      <main className="flex-1 p-8">
        <Text color="secondary">Loading stack...</Text>
      </main>
    );
  }

  if (!stack) {
    return (
      <main className="flex-1 p-8">
        <Text color="danger">Stack not found.</Text>
      </main>
    );
  }

  const isStopped = stack.status.state === "stopped";
  const hasUpdates = stack.updates?.hasUpdates ?? false;
  const isStandalone = !stack.entrypoint;

  const statusVariant: "success" | "warning" | "danger" =
    stack.status.state === "running"
      ? "success"
      : stack.status.state === "partial"
        ? "warning"
        : "danger";

  const statusLabel =
    stack.status.state === "running"
      ? "Running"
      : stack.status.state === "partial"
        ? "Partial"
        : "Stopped";

  const activeTab = routerState.location.pathname.endsWith("/edit") ? "editor" : "overview";

  const handleDown = () => {
    const isSelf = stack.containers.some(container => container.isSelf);
    const message = isSelf
      ? "This will stop Hosuto itself. You will lose access to the UI. Continue?"
      : `Stop and remove all containers in "${stack.name}"?`;
    if (!confirm(message)) {
      return;
    }

    stackAction.mutate({ name: stack.name, action: "down" });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-8 pt-8 pb-0 flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Dashboard", to: "/" }, { label: stackName }]} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Text as="h1" size="2xl" weight="bold" color="white" className="tracking-tight">
              {stackName}
            </Text>
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1",
                statusVariant === "success" && "border-success/20 bg-success/10",
                statusVariant === "warning" && "border-warning/20 bg-warning/10",
                statusVariant === "danger" && "border-danger/20 bg-danger/10",
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full pulse-dot",
                  statusVariant === "success" && "bg-success",
                  statusVariant === "warning" && "bg-warning",
                  statusVariant === "danger" && "bg-danger",
                )}
              />
              <Text size="xs" weight="bold" color={statusVariant} uppercase>
                {statusLabel}
              </Text>
            </div>
            <Text size="xs" mono color="secondary">
              {stack.status.running}/{stack.status.expected} Containers Active
            </Text>
          </div>

          <div className="flex items-center gap-1.5">
            {isStopped ? (
              <ActionBtn
                label="Up"
                onClick={() => stackAction.mutate({ name: stackName, action: "up" })}
                disabled={stackAction.isPending}
              >
                <Play size={16} />
              </ActionBtn>
            ) : (
              <>
                <ActionBtn
                  label="Restart"
                  onClick={() => stackAction.mutate({ name: stackName, action: "restart" })}
                  disabled={stackAction.isPending}
                >
                  <RefreshCw size={16} />
                </ActionBtn>
                <ActionBtn
                  label="Pull"
                  onClick={() => stackAction.mutate({ name: stackName, action: "pull" })}
                  disabled={stackAction.isPending}
                >
                  <Download size={16} />
                </ActionBtn>
              </>
            )}
            <OverflowMenu
              isStopped={isStopped}
              hasUpdates={hasUpdates}
              hasBuild={stack.hasBuildDirectives}
              isPending={stackAction.isPending || triggerCheck.isPending}
              onRestart={() => stackAction.mutate({ name: stackName, action: "restart" })}
              onDown={handleDown}
              onPull={() => stackAction.mutate({ name: stackName, action: "pull" })}
              onBuild={() => stackAction.mutate({ name: stackName, action: "build-up" })}
              onUpdate={() => stackAction.mutate({ name: stackName, action: "update" })}
              onCheckUpdates={() => triggerCheck.mutate()}
            />
          </div>
        </div>

        {!isStandalone && (
          <TabBar
            tabs={["overview", "editor"] as const}
            active={activeTab as "overview" | "editor"}
            onChange={tab => {
              if (tab === "editor") {
                navigate({ to: "/stacks/$stackName/edit", params: { stackName } });
              } else {
                navigate({ to: "/stacks/$stackName", params: { stackName } });
              }
            }}
          />
        )}
      </div>

      <Outlet />
    </div>
  );
};

const ActionBtn = ({
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
  <button
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-surface text-text-secondary transition-all hover:border-primary/50 hover:bg-white/5 hover:text-primary disabled:opacity-40"
  >
    {children}
  </button>
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
  onDown: () => void;
  onPull: () => void;
  onBuild: () => void;
  onUpdate: () => void;
  onCheckUpdates: () => void;
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/12 bg-surface text-text-secondary transition-all hover:bg-surface-hover hover:text-white"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl blur-panel py-2 shadow-2xl">
          {isStopped ? (
            <>
              <OverflowItem icon={<Play size={14} />} label="Up Stack" onClick={close} />
              <OverflowItem
                icon={<Download size={14} />}
                label="Pull Images"
                onClick={() => {
                  onPull();
                  close();
                }}
              />
              {hasBuild && (
                <OverflowItem
                  icon={<Hammer size={14} />}
                  label="Build & Up"
                  onClick={() => {
                    onBuild();
                    close();
                  }}
                />
              )}
            </>
          ) : (
            <>
              <OverflowItem
                icon={<RefreshCw size={14} />}
                label="Restart"
                onClick={() => {
                  onRestart();
                  close();
                }}
              />
              <OverflowItem
                icon={<Square size={14} />}
                label="Down Stack"
                danger
                onClick={() => {
                  onDown();
                  close();
                }}
              />
              {hasBuild && (
                <OverflowItem
                  icon={<Hammer size={14} />}
                  label="Build"
                  onClick={() => {
                    onBuild();
                    close();
                  }}
                />
              )}
            </>
          )}
          <div className="mx-3 my-1 h-px bg-border/20" />
          {hasUpdates ? (
            <OverflowItem
              icon={<ArrowUpCircle size={14} />}
              label="Update"
              accent
              onClick={() => {
                onUpdate();
                close();
              }}
            />
          ) : (
            <OverflowItem
              icon={<Search size={14} />}
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

const OverflowItem = ({
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
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex w-full items-center gap-3 px-4 py-2 text-xs font-medium transition-colors disabled:opacity-40",
      danger
        ? "text-text-secondary hover:text-danger hover:bg-white/5"
        : accent
          ? "text-text-secondary hover:text-primary hover:bg-white/5"
          : "text-text-secondary hover:text-white hover:bg-white/5",
    )}
  >
    {icon}
    {label}
  </button>
);

export const Route = createFileRoute("/stacks/$stackName")({
  component: StackLayout,
});

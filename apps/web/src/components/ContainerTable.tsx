import type { Container } from "@hosuto/shared";
import { Link } from "@tanstack/react-router";
import { useContainerAction } from "../hooks/useContainerAction";
import { STATUS_CONFIG, DEFAULT_STATUS } from "../lib/status";
import { getImageUrl } from "../lib/docker";
import { formatUptime } from "../lib/format";
import { ActionButton } from "./ActionButton";

export const ContainerTable = ({ containers }: { containers: Container[] }) => {
  const containerAction = useContainerAction();

  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto_auto_auto] overflow-hidden rounded-xl border border-border/50">
      <div className="col-span-full grid grid-cols-subgrid items-center border-b border-border bg-surface/50 text-xs uppercase tracking-wide text-text-muted">
        <div className="px-4 py-2.5 font-medium">Name</div>
        <div className="px-4 py-2.5 font-medium">Image</div>
        <div className="px-4 py-2.5 font-medium">Status</div>
        <div className="px-4 py-2.5 font-medium">Ports</div>
        <div className="px-4 py-2.5 font-medium">Uptime</div>
        <div className="px-4 py-2.5 text-right font-medium">Actions</div>
      </div>

      {containers.map(container => {
        const isPlaceholder = container.status === "not_created";
        const isStopped = container.state !== "running";
        const status = STATUS_CONFIG[container.status] || DEFAULT_STATUS;

        return (
          <div
            key={container.id}
            className={`col-span-full grid grid-cols-subgrid items-center border-b border-border transition-colors hover:bg-surface/40 ${isStopped ? "opacity-60" : ""}`}
          >
            <div className="flex min-w-0 items-center gap-2 px-4 py-2.5 text-sm font-semibold">
              {isPlaceholder ? (
                <span className="truncate text-text-muted">{container.name}</span>
              ) : (
                <Link
                  to="/containers/$containerId"
                  params={{ containerId: container.id }}
                  className="truncate text-white transition-colors hover:text-accent-cyan"
                >
                  {container.name}
                </Link>
              )}
              {container.isSelf && (
                <span className="shrink-0 rounded-full bg-accent-green/10 px-2 py-0.5 text-xs font-bold text-accent-green">
                  Hosuto
                </span>
              )}
            </div>
            <div className="truncate px-4 py-2.5 font-mono text-xs">
              {isPlaceholder ? (
                <span className="text-text-muted">—</span>
              ) : (
                <a
                  href={getImageUrl(container.image)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted transition-colors hover:text-white"
                >
                  {container.image}
                </a>
              )}
            </div>
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
                <span className={`text-xs font-bold tracking-tight ${status.text}`}>
                  {status.label}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-4 py-2.5 font-mono text-xs">
              {container.ports.length > 0 ? (
                container.ports.map(port => (
                  <span key={`${port.hostPort}-${port.containerPort}-${port.protocol}`}>
                    <span className="text-white">{port.hostPort}</span>
                    <span className="text-text-muted">:{port.containerPort}</span>
                    {port.protocol !== "tcp" && (
                      <span className="text-text-muted">/{port.protocol}</span>
                    )}
                  </span>
                ))
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </div>
            <div className="px-4 py-2.5 text-xs text-text-muted">
              {container.uptime ? formatUptime(container.uptime) : "—"}
            </div>
            <div className="px-4 py-2.5 text-right">
              {!isPlaceholder && (
                <div className="flex justify-end gap-1.5">
                  <Link
                    to="/containers/$containerId"
                    params={{ containerId: container.id }}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
                  >
                    Logs
                  </Link>
                  {!isStopped && (
                    <Link
                      to="/containers/$containerId/exec"
                      params={{ containerId: container.id }}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
                    >
                      Shell
                    </Link>
                  )}
                  {isStopped ? (
                    <ActionButton
                      label="Start"
                      className="text-accent-green"
                      disabled={containerAction.isPending}
                      onClick={() => containerAction.mutate({ id: container.id, name: container.name, action: "start" })}
                    />
                  ) : (
                    <>
                      <ActionButton
                        label="Restart"
                        disabled={containerAction.isPending}
                        onClick={() =>
                          containerAction.mutate({ id: container.id, name: container.name, action: "restart" })
                        }
                      />
                      <ActionButton
                        label="Stop"
                        className="text-accent-rose"
                        disabled={containerAction.isPending}
                        onClick={() => {
                          if (container.isSelf && !confirm("This will stop Hosuto. You will lose access to the UI. Continue?")) {
                            return;
                          }

                          containerAction.mutate({ id: container.id, name: container.name, action: "stop" });
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {containers.length === 0 && (
        <div className="col-span-full px-4 py-3 text-sm text-text-muted">No containers</div>
      )}
    </div>
  );
};

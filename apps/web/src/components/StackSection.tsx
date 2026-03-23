import type { Stack } from "@hosuto/shared";
import { useContainerAction } from "../hooks/useContainerAction";
import { useStackAction } from "../hooks/useStackAction";
import { STATUS_CONFIG, DEFAULT_STATUS } from "../lib/status";
import { getImageUrl } from "../lib/docker";
import { ActionButton } from "./ActionButton";

export const StackSection = ({ stack }: { stack: Stack }) => {
  const containerAction = useContainerAction();
  const stackAction = useStackAction();
  const isStopped = stack.status === "stopped";

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{stack.name}</h2>
          <span className="font-mono text-xs text-text-muted">{stack.entrypoint}</span>
        </div>
        <div className="flex gap-1.5">
          {isStopped ? (
            <ActionButton
              label="Up"
              className="text-accent-green"
              disabled={stackAction.isPending}
              onClick={() => stackAction.mutate({ name: stack.name, action: "up" })}
            />
          ) : (
            <>
              <ActionButton
                label="Restart"
                disabled={stackAction.isPending}
                onClick={() => stackAction.mutate({ name: stack.name, action: "restart" })}
              />
              <ActionButton
                label="Pull"
                disabled={stackAction.isPending}
                onClick={() => stackAction.mutate({ name: stack.name, action: "pull" })}
              />
              <ActionButton
                label="Down"
                className="text-accent-rose"
                disabled={stackAction.isPending}
                onClick={() => stackAction.mutate({ name: stack.name, action: "down" })}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(120px,1fr)_minmax(0,2fr)_100px_120px_150px_auto] overflow-hidden rounded-xl border border-border/50">
        <div className="col-span-full grid grid-cols-subgrid items-center border-b border-border bg-surface/50 text-xs uppercase tracking-wide text-text-muted">
          <div className="px-4 py-2.5 font-medium">Name</div>
          <div className="px-4 py-2.5 font-medium">Image</div>
          <div className="px-4 py-2.5 font-medium">Status</div>
          <div className="px-4 py-2.5 font-medium">Ports</div>
          <div className="px-4 py-2.5 font-medium">Uptime</div>
          <div className="px-4 py-2.5 text-right font-medium">Actions</div>
        </div>

        {stack.containers.map((container) => {
          const isStopped = container.state !== "running";
          const status = STATUS_CONFIG[container.status] || DEFAULT_STATUS;

          return (
            <div
              key={container.id}
              className={`col-span-full grid grid-cols-subgrid items-center border-b border-border transition-colors hover:bg-surface/40 ${isStopped ? "opacity-60" : ""}`}
            >
              <div className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-white">
                {container.name}
              </div>
              <div className="truncate px-4 py-2.5 font-mono text-xs">
                <a
                  href={getImageUrl(container.image)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-muted transition-colors hover:text-white"
                >
                  {container.image}
                </a>
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
                  container.ports.map((p) => (
                    <span key={`${p.hostPort}-${p.containerPort}-${p.protocol}`}>
                      <span className="text-white">{p.hostPort}</span>
                      <span className="text-text-muted">:{p.containerPort}</span>
                      {p.protocol !== "tcp" && (
                        <span className="text-text-muted">/{p.protocol}</span>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </div>
              <div className="px-4 py-2.5 text-xs text-text-muted">{container.uptime || "—"}</div>
              <div className="px-4 py-2.5 text-right">
                <div className="flex justify-end gap-1.5">
                  {isStopped ? (
                    <ActionButton
                      label="Start"
                      className="text-accent-green"
                      disabled={containerAction.isPending}
                      onClick={() => containerAction.mutate({ id: container.id, action: "start" })}
                    />
                  ) : (
                    <>
                      <ActionButton
                        label="Restart"
                        disabled={containerAction.isPending}
                        onClick={() => containerAction.mutate({ id: container.id, action: "restart" })}
                      />
                      <ActionButton
                        label="Stop"
                        className="text-accent-rose"
                        disabled={containerAction.isPending}
                        onClick={() => containerAction.mutate({ id: container.id, action: "stop" })}
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {stack.containers.length === 0 && (
          <div className="col-span-full px-4 py-3 text-sm text-text-muted">No containers</div>
        )}
      </div>
    </section>
  );
};

import type { Stack } from "@hosuto/shared";
import { Link } from "@tanstack/react-router";
import { useStackAction } from "../hooks/useStackAction";
import { ActionButton } from "./ActionButton";
import { ContainerTable } from "./ContainerTable";

export const StackSection = ({ stack }: { stack: Stack }) => {
  const stackAction = useStackAction();
  const isStopped = stack.status.state === "stopped";

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{stack.name}</h2>
          <span className="font-mono text-xs text-text-muted">{stack.entrypoint}</span>
        </div>
        <div className="flex gap-1.5">
          <Link
            to="/stacks/$stackName/edit"
            params={{ stackName: stack.name }}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
          >
            Edit
          </Link>
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

      <ContainerTable containers={stack.containers} />
    </section>
  );
};

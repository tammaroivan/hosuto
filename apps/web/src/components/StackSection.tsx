import type { Stack } from "@hosuto/shared";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useStackAction } from "../hooks/useStackAction";
import { api } from "../lib/api";
import { ActionButton } from "./ActionButton";
import { ContainerTable } from "./ContainerTable";

export const StackSection = ({ stack }: { stack: Stack }) => {
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
    onSuccess: () => {
      toast.success(`Checking updates for ${stack.name}...`);
    },
  });

  const handleDown = () => {
    if (!confirm(`Stop and remove all containers in "${stack.name}"?`)) {
      return;
    }

    stackAction.mutate({ name: stack.name, action: "down" });
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{stack.name}</h2>
          {!isStandalone && (
            <span className="font-mono text-xs text-text-muted">{stack.entrypoint}</span>
          )}
          {hasUpdates && (
            <span className="rounded-full bg-accent-cyan/10 px-2 py-0.5 text-xs font-bold text-accent-cyan">
              Updates available
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {!isStandalone && (
            <Link
              to="/stacks/$stackName/edit"
              params={{ stackName: stack.name }}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-bold text-text-muted transition-colors hover:border-border-hover hover:bg-border hover:text-white"
            >
              Edit
            </Link>
          )}
          {isStandalone ? (
            <>
              {hasUpdates ? (
                <ActionButton
                  label="Update"
                  className="text-accent-cyan"
                  disabled={stackAction.isPending}
                  onClick={() => stackAction.mutate({ name: stack.name, action: "update" })}
                />
              ) : (
                <ActionButton
                  label={triggerCheck.isPending ? "Checking..." : "Check Updates"}
                  disabled={triggerCheck.isPending}
                  onClick={() => triggerCheck.mutate()}
                />
              )}
            </>
          ) : isStopped ? (
            <>
              <ActionButton
                label="Up"
                className="text-accent-green"
                disabled={stackAction.isPending}
                onClick={() => stackAction.mutate({ name: stack.name, action: "up" })}
              />
              {stack.hasBuildDirectives && (
                <ActionButton
                  label="Build & Up"
                  disabled={stackAction.isPending}
                  onClick={() => stackAction.mutate({ name: stack.name, action: "build-up" })}
                />
              )}
            </>
          ) : (
            <>
              {hasUpdates ? (
                <ActionButton
                  label="Update"
                  className="text-accent-cyan"
                  disabled={stackAction.isPending}
                  onClick={() => stackAction.mutate({ name: stack.name, action: "update" })}
                />
              ) : (
                <ActionButton
                  label={triggerCheck.isPending ? "Checking..." : "Check Updates"}
                  disabled={stackAction.isPending || triggerCheck.isPending}
                  onClick={() => triggerCheck.mutate()}
                />
              )}
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
              {stack.hasBuildDirectives && (
                <ActionButton
                  label="Build"
                  disabled={stackAction.isPending}
                  onClick={() => stackAction.mutate({ name: stack.name, action: "build-up" })}
                />
              )}
              <ActionButton
                label="Down"
                className="text-accent-rose"
                disabled={stackAction.isPending}
                onClick={handleDown}
              />
            </>
          )}
        </div>
      </div>

      <ContainerTable containers={stack.containers} />
    </section>
  );
};

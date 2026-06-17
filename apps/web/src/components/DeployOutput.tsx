import React from "react";
import { X, Check, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import type { DeployOutput as DeployOutputType } from "../contexts/WebSocketContext";
import { useResolveConflict } from "../hooks/useResolveConflict";

export const DeployOutput = ({
  output,
  onClose,
}: {
  output: DeployOutputType;
  onClose: () => void;
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const resolveConflict = useResolveConflict();

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output.lines.length]);

  const conflictContainers = output.conflictContainers ?? [];
  const showConflictRetry = output.complete && !output.success && conflictContainers.length > 0;
  const single = conflictContainers.length === 1;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg z-50 ml-14">
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
        <div className="flex items-center gap-2">
          {output.complete ? (
            output.success ? (
              <Check size={14} className="text-accent-green" />
            ) : (
              <AlertTriangle size={14} className="text-accent-rose" />
            )
          ) : (
            <Loader2 size={14} className="animate-spin text-accent-cyan" />
          )}
          <span className="text-sm font-bold text-white">{output.stackName}</span>
          <span className="text-sm text-text-muted">
            {output.complete ? (output.success ? "completed" : "failed") : "deploying..."}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      {showConflictRetry && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-accent-rose/10 px-4 py-2">
          <p className="text-sm text-text-primary">
            {single
              ? `A container named "${conflictContainers[0]}" already exists and isn't managed by this stack.`
              : `${conflictContainers.length} containers (${conflictContainers.join(", ")}) already exist and aren't managed by this stack.`}{" "}
            Remove {single ? "it" : "them"} to let Hosuto recreate {single ? "it" : "them"}.
          </p>
          <button
            onClick={() =>
              resolveConflict.mutate({
                name: output.stackName,
                containers: conflictContainers,
                action: output.action ?? "up",
                services: output.services,
              })
            }
            disabled={resolveConflict.isPending}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-accent-rose px-3 py-1.5 text-sm font-bold text-bg transition-colors hover:bg-white disabled:opacity-50"
          >
            {resolveConflict.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Remove &amp; retry
          </button>
        </div>
      )}
      <div ref={scrollRef} className="max-h-48 overflow-y-auto px-4 py-2">
        {output.lines.map((line, index) => (
          <div key={index} className="font-mono text-xs leading-5 text-text-muted">
            {line.text}
          </div>
        ))}
        {output.lines.length === 0 && (
          <div className="font-mono text-xs text-text-muted">Waiting for output...</div>
        )}
      </div>
    </div>
  );
};

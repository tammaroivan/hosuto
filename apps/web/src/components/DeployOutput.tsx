import React from "react";
import { X, Check, AlertTriangle, Loader2 } from "lucide-react";
import type { DeployOutput as DeployOutputType } from "../hooks/useDockerEvents";

export const DeployOutput = ({
  output,
  onClose,
}: {
  output: DeployOutputType;
  onClose: () => void;
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output.lines.length]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg">
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
      <div ref={scrollRef} className="max-h-48 overflow-y-auto px-4 py-2">
        {output.lines.map((line, index) => (
          <div key={index} className="font-mono text-xs leading-5 text-text-muted">
            {line}
          </div>
        ))}
        {output.lines.length === 0 && (
          <div className="font-mono text-xs text-text-muted">Waiting for output...</div>
        )}
      </div>
    </div>
  );
};

import React from "react";
import { useCreateStack } from "../hooks/useCreateStack";

const STACK_NAME_REGEX = /^[a-z0-9][a-z0-9-]*$/;

export const CreateStackDialog = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = React.useState("");
  const createStack = useCreateStack();

  const trimmed = name.trim();
  const isValid = trimmed.length > 0 && trimmed.length <= 64 && STACK_NAME_REGEX.test(trimmed);

  const handleSubmit = () => {
    if (!isValid) {
      return;
    }

    createStack.mutate(trimmed, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-4 text-sm font-bold text-white">New Stack</h3>
        <input
          autoFocus
          value={name}
          onChange={event => setName(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") {
              handleSubmit();
            }
            if (event.key === "Escape") {
              onClose();
            }
          }}
          placeholder="my-stack"
          className="mb-2 w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-white outline-none transition-colors placeholder:text-text-muted/50 focus:border-accent-cyan"
        />
        <p className="mb-4 text-sm text-text-muted">
          Lowercase letters, numbers, and hyphens only.
        </p>
        {createStack.isError && (
          <p className="mb-4 text-sm text-accent-rose">{createStack.error.message}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-1.5 text-sm font-bold text-text-muted transition-colors hover:border-border-hover hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || createStack.isPending}
            className="rounded-md bg-accent-cyan px-4 py-1.5 text-sm font-bold text-bg transition-colors hover:bg-white disabled:opacity-50"
          >
            {createStack.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
};

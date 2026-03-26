import React from "react";
import { Search } from "lucide-react";
import type { StackState } from "@hosuto/shared";

interface SearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StackState | null;
  onStatusFilterChange: (value: StackState | null) => void;
}

const STATUS_COLORS: Record<StackState, string> = {
  running: "border-accent-green/50 bg-accent-green/10 text-accent-green",
  partial: "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
  stopped: "border-accent-rose/50 bg-accent-rose/10 text-accent-rose",
};

export const SearchBar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: SearchBarProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        onSearchChange("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearchChange]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          ref={inputRef}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search stacks, containers, images..."
          className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent-cyan"
        />
        {!search && (
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-sm text-text-muted">
            {navigator.platform?.includes("Mac") ? "\u2318 K" : "Ctrl K"}
          </kbd>
        )}
      </div>
      <div className="flex gap-1">
        {(["running", "partial", "stopped"] as const).map(state => (
          <button
            key={state}
            onClick={() => onStatusFilterChange(statusFilter === state ? null : state)}
            className={`rounded-md border px-2.5 py-1.5 text-sm font-bold capitalize transition-colors ${
              statusFilter === state
                ? STATUS_COLORS[state]
                : "border-border text-text-muted hover:border-border-hover hover:text-white"
            }`}
          >
            {state}
          </button>
        ))}
      </div>
    </div>
  );
};

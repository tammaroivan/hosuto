import React from "react";
import { Terminal, PlusCircle, Bell } from "lucide-react";
import { Button } from "./ui/Button";

interface CommandBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onCreateStack: () => void;
}

export const CommandBar = ({ search, onSearchChange, onCreateStack }: CommandBarProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        onSearchChange("");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearchChange]);

  return (
    <header className="z-40 flex h-14 items-center gap-4 border-b border-border/30 px-4 blur-panel-dark">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-2xl flex-1">
          <Terminal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
          <input
            ref={inputRef}
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Search stacks, containers, images..."
            className="w-full rounded-lg border border-border/60 bg-surface-hover/50 py-1.5 pl-9 pr-3 font-mono text-xs text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="primary" size="md" onClick={onCreateStack}>
          <PlusCircle size={14} />
          New Stack
        </Button>
        <div className="h-4 w-px bg-border" />
        <button className="relative rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-white">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
};

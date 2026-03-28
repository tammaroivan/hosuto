import React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "../../lib/cn";
import { useClickOutside } from "../../hooks/useClickOutside";

interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  className?: string;
}

export const DropdownMenu = ({ items, className }: DropdownMenuProps) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);

  useClickOutside(ref, close, open);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-all hover:bg-surface-hover hover:text-white"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl blur-panel py-1 shadow-2xl">
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2 text-xs font-medium transition-colors",
                "hover:bg-white/5",
                "disabled:opacity-40 disabled:pointer-events-none",
                item.danger
                  ? "text-danger hover:text-danger"
                  : "text-text-secondary hover:text-white",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

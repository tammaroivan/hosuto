import React from "react";
import { Search, Terminal } from "lucide-react";
import { cn } from "../../lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: "search" | "terminal";
}

const iconComponents = {
  search: Search,
  terminal: Terminal,
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className, ...props }, ref) => {
    const Icon = icon ? iconComponents[icon] : null;

    return (
      <div className="relative">
        {Icon && (
          <Icon
            size={14}
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              icon === "terminal" ? "text-primary" : "text-text-muted",
            )}
          />
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-lg border border-border bg-surface-hover/50 text-xs text-text-primary",
            "placeholder:text-text-muted outline-none transition-colors",
            "focus:border-primary/50",
            icon ? "pl-9 pr-3" : "px-3",
            "py-1.5",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

import type React from "react";
import { cn } from "../lib/cn";

interface SummaryItem {
  label: string;
  value: React.ReactNode;
}

interface SummaryStripProps {
  items: SummaryItem[];
  className?: string;
}

export const SummaryStrip = ({ items, className }: SummaryStripProps) => {
  return (
    <div className={cn("blur-panel flex h-11 items-center gap-6 rounded-xl px-5", className)}>
      {items.map((item, index) => (
        <div key={item.label} className="flex items-center gap-2 shrink-0">
          {index > 0 && <div className="mr-4 h-4 w-px bg-border/40" />}
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {item.label}
          </span>
          <span className="text-xs font-mono">{item.value}</span>
        </div>
      ))}
    </div>
  );
};

import { cn } from "../lib/cn";

interface TabBarProps<T extends string> {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  labels?: Partial<Record<T, string>>;
}

export const TabBar = <T extends string>({
  tabs,
  active,
  onChange,
  labels,
}: TabBarProps<T>) => {
  return (
    <div className="flex items-center gap-8 border-b border-border/40">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "pb-3 text-xs font-bold uppercase tracking-widest transition-all -mb-px",
            active === tab
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-white",
          )}
        >
          {labels?.[tab] ?? tab}
        </button>
      ))}
    </div>
  );
};

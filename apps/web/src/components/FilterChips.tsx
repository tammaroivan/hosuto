import { cn } from "../lib/cn";

interface FilterChipsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
}

export const FilterChips = <T extends string>({
  options,
  value,
  onChange,
  labels,
}: FilterChipsProps<T>) => {
  return (
    <div className="flex items-center gap-1.5">
      {options.map(option => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
            value === option
              ? "bg-primary/20 text-primary border border-primary/30"
              : "text-text-secondary hover:text-white",
          )}
        >
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
};

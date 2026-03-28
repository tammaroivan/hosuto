import { cn } from "../../lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Toggle = ({ checked, onChange, disabled = false, className }: ToggleProps) => {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        checked ? "bg-primary/20 border border-primary/30" : "bg-border",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 rounded-full transition-transform",
          checked ? "translate-x-3.5 bg-primary" : "translate-x-0.5 bg-text-secondary",
        )}
      />
    </button>
  );
};

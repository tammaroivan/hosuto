import { cn } from "../../lib/cn";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export const Divider = ({ orientation = "horizontal", className }: DividerProps) => {
  return (
    <div
      className={cn(
        orientation === "horizontal" ? "h-px w-full bg-border/20" : "h-4 w-px bg-border/40",
        className,
      )}
    />
  );
};

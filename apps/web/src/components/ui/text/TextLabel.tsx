import type React from "react";
import { cn } from "../../../lib/cn";

export const TextLabel = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("text-xs font-bold uppercase tracking-wider text-text-secondary", className)}
      {...props}
    >
      {children}
    </span>
  );
};

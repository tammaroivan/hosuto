import type React from "react";
import { cn } from "../../lib/cn";

type BlurVariant = "default" | "dark";

interface BlurPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BlurVariant;
  rounded?: "xl" | "2xl";
}

export const BlurPanel = ({
  variant = "default",
  rounded = "2xl",
  className,
  children,
  ...props
}: BlurPanelProps) => {
  return (
    <div
      className={cn(
        variant === "dark" ? "blur-panel-dark" : "blur-panel",
        rounded === "xl" ? "rounded-xl" : "rounded-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

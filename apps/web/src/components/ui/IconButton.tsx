import type React from "react";
import { cn } from "../../lib/cn";

type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  label: string;
}

const sizeStyles: Record<IconButtonSize, string> = {
  sm: "h-7 w-7 rounded-lg",
  md: "h-8 w-8 rounded-lg",
  lg: "h-10 w-10 rounded-xl",
};

export const IconButton = ({
  size = "md",
  label,
  className,
  children,
  ...props
}: IconButtonProps) => {
  return (
    <button
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center text-text-secondary transition-all",
        "hover:text-primary hover:bg-surface-hover",
        "disabled:opacity-40 disabled:pointer-events-none",
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const IconActionButton = ({
  size = "lg",
  label,
  className,
  children,
  ...props
}: IconButtonProps) => {
  return (
    <button
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center bg-surface border border-white/12 text-text-secondary transition-all",
        "hover:border-primary/50 hover:bg-white/5 hover:text-primary",
        "disabled:opacity-40 disabled:pointer-events-none",
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

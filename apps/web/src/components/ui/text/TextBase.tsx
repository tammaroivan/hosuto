import type React from "react";
import { cn } from "../../../lib/cn";

type TextSize = "xs" | "sm" | "base" | "lg" | "xl" | "2xl";
type TextWeight = "normal" | "medium" | "semibold" | "bold";
type TextColor =
  | "primary"
  | "secondary"
  | "muted"
  | "white"
  | "success"
  | "danger"
  | "warning"
  | "accent";

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  mono?: boolean;
  uppercase?: boolean;
  truncate?: boolean;
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3" | "label";
}

const sizeStyles: Record<TextSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

const weightStyles: Record<TextWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const colorStyles: Record<TextColor, string> = {
  primary: "text-text-primary",
  secondary: "text-text-secondary",
  muted: "text-text-muted",
  white: "text-white",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  accent: "text-primary",
};

export const TextBase = ({
  size = "sm",
  weight = "normal",
  color = "primary",
  mono = false,
  uppercase = false,
  truncate = false,
  as: Tag = "span",
  className,
  children,
  ...props
}: TextProps) => {
  return (
    <Tag
      className={cn(
        sizeStyles[size],
        weightStyles[weight],
        colorStyles[color],
        mono && "font-mono",
        uppercase && "uppercase tracking-wider",
        truncate && "truncate",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
};

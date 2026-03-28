import type React from "react";
import { cn } from "../lib/cn";

export const Table = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={cn("blur-panel rounded-2xl overflow-hidden", className)} {...props}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
};

export const TableHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => {
  return (
    <thead className={cn("sticky top-0 bg-surface z-10", className)} {...props}>
      <tr className="border-b border-border/50">{children}</tr>
    </thead>
  );
};

export const TableHeaderCell = ({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) => {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableBody = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) => {
  return (
    <tbody className={cn("divide-y divide-border/10", className)} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) => {
  return (
    <tr
      className={cn("group transition-colors hover:bg-white/[0.02]", className)}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableCell = ({
  className,
  children,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) => {
  return (
    <td className={cn("px-4 py-3 text-sm", className)} {...props}>
      {children}
    </td>
  );
};

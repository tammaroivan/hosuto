import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

interface BreadcrumbItem {
  label: string;
  to?: string;
  params?: Record<string, string>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  return (
    <nav
      className={cn(
        "flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary",
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.label} className="flex items-center gap-2">
            {index > 0 && <ChevronRight size={10} className="text-text-secondary/40" />}
            {item.to && !isLast ? (
              <Link
                to={item.to}
                params={item.params}
                className="transition-colors hover:text-text-primary"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-text-secondary" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

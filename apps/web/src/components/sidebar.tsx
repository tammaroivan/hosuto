import { Link, useRouterState } from "@tanstack/react-router";
import {
  Box,
  LayoutGrid,
  Bell,
  Network,
  Database,
  Settings,
  RefreshCw,
  Activity,
} from "lucide-react";
import { cn } from "../lib/cn";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, enabled: true },
  { to: "/notifications", label: "Notifications", icon: Bell, enabled: false },
  { to: "/network", label: "Network", icon: Network, enabled: false },
  { to: "/volumes", label: "Volumes", icon: Database, enabled: false },
  { to: "/updates", label: "Updates", icon: RefreshCw, enabled: false },
  { to: "/activity", label: "Activity", icon: Activity, enabled: false },
];

export const Sidebar = () => {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <aside className="z-50 flex w-14 shrink-0 flex-col items-center border-r border-border/50 py-6 blur-panel">
      <div className="mb-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/20">
          <Box size={18} className="text-primary" />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-4">
        {NAV_ITEMS.map(item => {
          const isActive = item.to === "/" ? currentPath === "/" : currentPath.startsWith(item.to);

          if (item.enabled) {
            return (
              <Link
                key={item.to}
                to={item.to as "/"}
                className={cn(
                  "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                  isActive
                    ? "bg-primary/10 text-primary active-glow"
                    : "text-text-secondary hover:text-white hover:bg-surface-hover",
                )}
              >
                <item.icon size={20} />
                <Tooltip label={item.label} />
              </Link>
            );
          }

          return (
            <div
              key={item.to}
              className="group relative flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl text-text-muted/40 transition-all"
            >
              <item.icon size={20} />
              <Tooltip label={`${item.label} (coming soon)`} />
            </div>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Link
          to="/settings"
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
            currentPath === "/settings"
              ? "bg-primary/10 text-primary active-glow"
              : "text-text-secondary hover:text-white hover:bg-surface-hover",
          )}
        >
          <Settings size={20} />
        </Link>
      </div>
    </aside>
  );
};

const Tooltip = ({ label }: { label: string }) => (
  <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
    {label}
  </span>
);

import { Link } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { useHealth } from "../hooks/useHealth";
import { useDockerEvents, type ConnectionStatus } from "../hooks/useDockerEvents";

const NAV_ITEMS = [{ to: "/", label: "Dashboard", icon: LayoutDashboard }] as const;

const STATUS_LABEL: Record<ConnectionStatus, { color: string; text: string }> = {
  connected: { color: "bg-accent-green", text: "Live" },
  connecting: { color: "bg-yellow-500", text: "Connecting..." },
  disconnected: { color: "bg-accent-rose", text: "Disconnected" },
};

export const Sidebar = () => {
  const health = useHealth();
  const { status } = useDockerEvents();
  const statusInfo = STATUS_LABEL[status];

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-bg flex flex-col">
      <div className="px-4 py-4">
        <h1 className="text-lg font-bold tracking-tight text-white">Hosuto</h1>
      </div>

      <nav className="flex-1 px-2 py-2">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary [&.active]:bg-surface-hover [&.active]:text-white"
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3 flex items-center justify-between text-xs text-text-muted">
        {health.data && <span>v{health.data.version}</span>}
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-2 w-2 rounded-full ${statusInfo.color}`} />
          <span>{statusInfo.text}</span>
        </div>
      </div>
    </aside>
  );
};

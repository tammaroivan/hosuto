import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { useDockerEvents, type ConnectionStatus } from "../hooks/useDockerEvents";

export const Route = createRootRoute({
  component: RootLayout,
});

const STATUS_LABEL: Record<ConnectionStatus, { color: string; text: string }> = {
  connected: { color: "bg-green-500", text: "Live" },
  connecting: { color: "bg-yellow-500", text: "Connecting..." },
  disconnected: { color: "bg-red-500", text: "Disconnected" },
};

function RootLayout() {
  const { status, lastEvent } = useDockerEvents();
  const statusInfo = STATUS_LABEL[status];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold tracking-tight">Hosuto</h1>
            <div className="flex gap-4 text-sm">
              <Link to="/" className="hover:text-white [&.active]:text-white">
                Dashboard
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            {lastEvent && <span className="text-xs text-gray-500">{lastEvent}</span>}
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${statusInfo.color}`} />
              <span className="text-xs">{statusInfo.text}</span>
            </div>
          </div>
        </div>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

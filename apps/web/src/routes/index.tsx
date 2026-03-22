import { createFileRoute } from "@tanstack/react-router";
import { useHealth } from "../hooks/useHealth";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const health = useHealth();

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      {health.isLoading && <p className="text-gray-400">Connecting to server...</p>}
      {health.isError && <p className="text-red-400">Failed to connect to server.</p>}
      {health.data && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 inline-block">
          <p className="text-green-400 font-medium">
            Connected to {health.data.name} v{health.data.version}
          </p>
          <p className="text-gray-500 text-sm mt-1">Status: {health.data.status}</p>
        </div>
      )}
    </div>
  );
}

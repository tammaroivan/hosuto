import { createFileRoute } from "@tanstack/react-router";
import { useHealth } from "../hooks/useHealth";
import { useStacks } from "../hooks/useStacks";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  running: "bg-green-500",
  stopped: "bg-gray-500",
  exited: "bg-gray-500",
  restarting: "bg-yellow-500",
  unhealthy: "bg-red-500",
  dead: "bg-red-500",
  partial: "bg-yellow-500",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[status] || "bg-gray-500"}`}
    />
  );
}

function Dashboard() {
  const health = useHealth();
  const stacks = useStacks();

  const allContainers = stacks.data?.flatMap((stack) => stack.containers) || [];
  const running = allContainers.filter((container) => container.state === "running").length;
  const stopped = allContainers.length - running;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>

        {health.data && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            {health.data.name} v{health.data.version}
          </div>
        )}
      </div>

      {health.isLoading && <p className="text-gray-400">Connecting to server...</p>}
      {health.isError && <p className="text-red-400">Failed to connect to server.</p>}

      {stacks.data && (
        <div className="flex gap-4 text-sm">
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2">
            <span className="text-gray-400">Containers</span>{" "}
            <span className="font-medium">{allContainers.length}</span>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2">
            <span className="text-gray-400">Running</span>{" "}
            <span className="font-medium text-green-400">{running}</span>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2">
            <span className="text-gray-400">Stopped</span>{" "}
            <span className="font-medium text-gray-500">{stopped}</span>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2">
            <span className="text-gray-400">Stacks</span>{" "}
            <span className="font-medium">{stacks.data.length}</span>
          </div>
        </div>
      )}

      {stacks.isLoading && <p className="text-gray-400">Loading stacks...</p>}
      {stacks.isError && <p className="text-red-400">Failed to load stacks.</p>}
      {stacks.data && stacks.data.length === 0 && (
        <p className="text-gray-500">No stacks found. Mount your compose files directory.</p>
      )}

      <div className="grid gap-4">
        {stacks.data?.map((stack) => (
          <div key={stack.name} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center gap-3 mb-3">
              <StatusDot status={stack.status} />
              <h3 className="font-medium text-lg">{stack.name}</h3>
              <span className="text-xs text-gray-500">
                {stack.containers.length} container{stack.containers.length !== 1 ? "s" : ""}
                {" · "}
                {stack.files.length} file{stack.files.length !== 1 ? "s" : ""}
              </span>
            </div>

            {stack.containers.length > 0 && (
              <div className="grid gap-2">
                {stack.containers.map((container) => (
                  <div
                    key={container.id}
                    className="flex items-center gap-3 rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm"
                  >
                    <StatusDot status={container.status} />
                    <span className="font-medium text-gray-200 min-w-[160px]">
                      {container.name}
                    </span>
                    <span className="text-gray-500 font-mono text-xs truncate flex-1">
                      {container.image}
                    </span>
                    {container.ports.length > 0 && (
                      <div className="flex gap-1.5">
                        {container.ports.map((port) => (
                          <span
                            key={`${port.hostPort}-${port.containerPort}-${port.protocol}`}
                            className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-mono"
                          >
                            {port.hostPort}:{port.containerPort}
                          </span>
                        ))}
                      </div>
                    )}
                    {container.uptime && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {container.uptime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {stack.containers.length === 0 && (
              <p className="text-sm text-gray-600">No containers running</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

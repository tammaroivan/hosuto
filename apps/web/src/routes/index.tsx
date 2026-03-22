import { createFileRoute } from "@tanstack/react-router";
import { useHealth } from "../hooks/useHealth";
import { useStacks } from "../hooks/useStacks";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const health = useHealth();
  const stacks = useStacks();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>

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

      <div>
        <h3 className="text-lg font-medium mb-3">Stacks</h3>

        {stacks.isLoading && <p className="text-gray-400">Loading stacks...</p>}
        {stacks.isError && <p className="text-red-400">Failed to load stacks.</p>}
        {stacks.data && stacks.data.length === 0 && (
          <p className="text-gray-500">No stacks found. Mount your compose files directory.</p>
        )}

        <div className="grid gap-4">
          {stacks.data?.map((stack) => (
            <div key={stack.name} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-lg">{stack.name}</h4>
                <span className="text-xs text-gray-500 font-mono">{stack.entrypoint}</span>
              </div>

              <div className="text-sm text-gray-400 mb-3">
                {stack.files.length} file{stack.files.length !== 1 ? "s" : ""} &middot;{" "}
                {stack.files.reduce((sum, f) => sum + f.services.length, 0)} services
              </div>

              <div className="space-y-2">
                {stack.files.map((file) => (
                  <div key={file.path} className="rounded border border-gray-800 bg-gray-950 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-gray-300">{file.relativePath}</span>
                      {file.includedBy && (
                        <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                          included
                        </span>
                      )}
                    </div>

                    {file.services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {file.services.map((service) => (
                          <span
                            key={service}
                            className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    )}

                    {file.envFiles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {file.envFiles.map((envFile) => (
                          <span
                            key={envFile}
                            className="text-xs bg-yellow-900/40 text-yellow-300 px-2 py-0.5 rounded"
                          >
                            {envFile}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

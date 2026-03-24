import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Container } from "@hosuto/shared";
import { api, wsUrl } from "../lib/api";
import { Terminal } from "../components/Terminal";

const ContainerExec = () => {
  const { containerId } = Route.useParams();
  const terminalRef = React.useRef<{ write: (data: string) => void } | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const [connected, setConnected] = React.useState(false);

  const container = useQuery({
    queryKey: ["container", containerId],
    queryFn: async () => {
      const res = await api.containers[":id"].$get({ param: { id: containerId } });

      if (!res.ok) {
        throw new Error("Container not found");
      }

      return res.json() as Promise<Container>;
    },
  });

  const sendMessage = React.useCallback((message: object) => {
    const socket = wsRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const handleData = React.useCallback(
    (data: string) => {
      sendMessage({ type: "exec:input", data });
    },
    [sendMessage],
  );

  const handleResize = React.useCallback(
    (cols: number, rows: number) => {
      sendMessage({ type: "exec:resize", cols, rows });
    },
    [sendMessage],
  );

  React.useEffect(() => {
    if (container.data?.state !== "running") {
      return;
    }

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "exec:start", containerId }));
      setConnected(true);
    };

    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "exec:output" && message.data) {
          terminalRef.current?.write(message.data);
        }

        if (message.type === "exec:exit" || message.type === "exec:error") {
          setConnected(false);
        }
      } catch {
        console.info("Received non-JSON message:", event.data);
      }
    };

    socket.onclose = () => {
      setConnected(false);
    };

    return () => {
      socket.onclose = null;
      socket.close();
      wsRef.current = null;
    };
  }, [containerId, container.data?.state]);

  if (container.isLoading) {
    return <p className="text-text-muted">Loading container...</p>;
  }

  if (container.isError || !container.data) {
    return <p className="text-accent-rose">Failed to load container.</p>;
  }

  if (container.data.state !== "running") {
    return (
      <div className="space-y-3">
        <Link
          to="/containers/$containerId"
          params={{ containerId }}
          className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.1em] text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={14} />
          Back to container
        </Link>
        <p className="text-text-muted">Container is not running. Start it to use the shell.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/containers/$containerId"
            params={{ containerId }}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.1em] text-text-muted transition-colors hover:text-text-primary"
          >
            <ChevronLeft size={14} />
            Back
          </Link>
          <h1 className="text-lg font-bold text-white">{container.data.name}</h1>
          <span className="text-sm text-text-muted">Shell</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-accent-green" : "bg-text-muted"}`}
          />
          <span className="text-xs text-text-muted">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-[#0d0d0f] p-1">
        <Terminal ref={terminalRef} onData={handleData} onResize={handleResize} />
      </div>
    </div>
  );
};

export const Route = createFileRoute("/containers_/$containerId/exec")({
  component: ContainerExec,
});

import { useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { api } from "../lib/api";

export interface LogLine {
  stream: "stdout" | "stderr";
  text: string;
  timestamp: string;
}

export const useContainerLogs = (containerId: string, tail = 200) => {
  const queryClient = useQueryClient();
  const [streamedLines, setStreamedLines] = React.useState<LogLine[]>([]);
  const wsRef = React.useRef<WebSocket | null>(null);

  const initial = useQuery({
    queryKey: ["container-logs", containerId, tail],
    queryFn: async () => {
      const res = await api.containers[":id"].logs.$get({
        param: { id: containerId },
        query: { tail: String(tail) },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch logs");
      }

      return res.json() as Promise<LogLine[]>;
    },
  });

  React.useEffect(() => {
    const wsUrl = import.meta.env.DEV
      ? "ws://localhost:3000/ws"
      : `ws://${window.location.host}/ws`;

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "subscribe:logs", containerId }));
    };

    socket.onmessage = event => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "log" && message.payload.containerId === containerId) {
          setStreamedLines(prev => [...prev, ...message.payload.lines]);
        }

        // Resubscribe to logs after container restart
        if (
          message.type === "container:status" &&
          message.payload.id === containerId &&
          message.payload.action === "start"
        ) {
          socket.send(JSON.stringify({ type: "subscribe:logs", containerId }));
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", event.data, error);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "unsubscribe:logs" }));
      }

      socket.close();
      wsRef.current = null;
      setStreamedLines([]);
    };
  }, [containerId]);

  const lines = [...(initial.data || []), ...streamedLines];

  const clear = React.useCallback(() => {
    setStreamedLines([]);
    queryClient.setQueryData(["container-logs", containerId, tail], []);
  }, [queryClient, containerId, tail]);

  return { lines, isLoading: initial.isLoading, isError: initial.isError, clear };
};

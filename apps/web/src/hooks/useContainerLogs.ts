import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LogLine } from "@hosuto/shared";
import { api } from "../lib/api";
import { wsManager } from "../lib/ws";

const MAX_LOG_LINES = 10_000;

export const useContainerLogs = (containerId: string, tail = 200) => {
  const queryClient = useQueryClient();
  const [streamedLines, setStreamedLines] = React.useState<LogLine[]>([]);

  const initial = useQuery({
    queryKey: ["container-logs", containerId, tail],
    queryFn: async () => {
      const res = await api.containers[":id"].logs.$get({
        param: { id: containerId },
        query: { tail: String(tail) },
      });

      if (!res.ok) {
        return [];
      }

      return res.json() as Promise<LogLine[]>;
    },
    retry: 1,
  });

  React.useEffect(() => {
    wsManager.send({ type: "subscribe:logs", containerId });

    const removeHandler = wsManager.onMessage(message => {
      if (message.type === "log" && message.payload.containerId === containerId) {
        setStreamedLines(prev => {
          const combined = [...prev, ...message.payload.lines];

          return combined.length > MAX_LOG_LINES
            ? combined.slice(combined.length - MAX_LOG_LINES)
            : combined;
        });
      }

      if (
        message.type === "container:status" &&
        message.payload.id === containerId &&
        message.payload.action === "start"
      ) {
        wsManager.send({ type: "subscribe:logs", containerId });
      }
    });

    return () => {
      wsManager.send({ type: "unsubscribe:logs" });
      removeHandler();
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

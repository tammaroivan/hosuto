import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Container, Stack } from "@hosuto/shared";

const WS_URL = import.meta.env.DEV ? "ws://localhost:3000/ws" : `ws://${window.location.host}/ws`;

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

const ACTION_TO_STATE: Record<string, { status: Container["status"]; state: string }> = {
  start: { status: "running", state: "running" },
  stop: { status: "exited", state: "exited" },
  die: { status: "exited", state: "exited" },
  kill: { status: "exited", state: "exited" },
  pause: { status: "stopped", state: "paused" },
  unpause: { status: "running", state: "running" },
  restart: { status: "restarting", state: "restarting" },
};

function getStackStatus(containers: Container[]): Stack["status"] {
  const running = containers.filter((ct) => ct.state === "running").length;
  const total = containers.length;

  if (total === 0 || running === 0) {
    return "stopped";
  }

  if (running === total) {
    return "running";
  }

  return "partial";
}

export function useDockerEvents() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    function handleContainerEvent(payload: {
      id: string;
      name: string;
      action: string;
      stackName: string | null;
    }) {
      setLastEvent(`${payload.name}: ${payload.action}`);

      const stateUpdate = ACTION_TO_STATE[payload.action];
      if (!stateUpdate) {
        return;
      }

      queryClient.setQueryData(["stacks"], (old: Stack[] | undefined) => {
        if (!old) {
          return old;
        }

        return old.map((stack) => {
          if (stack.name !== payload.stackName) {
            return stack;
          }

          const containerIndex = stack.containers.findIndex((ct) => ct.id === payload.id);
          if (containerIndex === -1) {
            return stack;
          }

          const existingContainer = stack.containers[containerIndex];
          if (existingContainer.state === stateUpdate.state) {
            return stack;
          }

          const updatedContainers = [...stack.containers];
          updatedContainers[containerIndex] = {
            ...existingContainer,
            status: stateUpdate.status,
            state: stateUpdate.state,
            uptime: stateUpdate.state === "running" ? "Up just now" : null,
          };

          return {
            ...stack,
            containers: updatedContainers,
            status: getStackStatus(updatedContainers),
          };
        });
      });
    }

    function connect() {
      if (!mountedRef.current) {
        return;
      }

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      setStatus("connecting");
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        retriesRef.current = 0;
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "container:status") {
            handleContainerEvent(message.payload);
          }
        } catch {
          console.error("Failed to parse WebSocket message:", event.data);
        }
      };

      socket.onclose = () => {
        if (!mountedRef.current) {
          return;
        }

        setStatus("disconnected");

        const delay = Math.min(
          RECONNECT_BASE_DELAY * Math.pow(2, retriesRef.current),
          RECONNECT_MAX_DELAY,
        );

        retriesRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {};
    }

    connect();

    return () => {
      mountedRef.current = false;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [queryClient]);

  return { status, lastEvent };
}

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
  restart: { status: "running", state: "running" },
};

const getStackStatus = (containers: Container[]): Stack["status"] => {
  const running = containers.filter((ct) => ct.state === "running").length;

  if (running === 0) {
    return "stopped";
  }

  return running === containers.length ? "running" : "partial";
};

const updateContainerInStacks = (
  stacks: Stack[],
  containerId: string,
  stateUpdate: { status: Container["status"]; state: string },
): Stack[] | null => {
  let changed = false;

  const updated = stacks.map((stack) => {
    const idx = stack.containers.findIndex((ct) => ct.id === containerId);
    if (idx === -1 || stack.containers[idx].state === stateUpdate.state) {
      return stack;
    }

    changed = true;
    const containers = [...stack.containers];
    containers[idx] = {
      ...containers[idx],
      status: stateUpdate.status,
      state: stateUpdate.state,
      uptime: stateUpdate.state === "running" ? "Up just now" : null,
    };

    return { ...stack, containers, status: getStackStatus(containers) };
  });

  return changed ? updated : null;
};

export const useDockerEvents = () => {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  useEffect(() => {
    const connect = () => {
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
          if (message.type !== "container:status") {
            return;
          }

          const { payload } = message;
          setLastEvent(`${payload.name}: ${payload.action}`);

          const stateUpdate = ACTION_TO_STATE[payload.action];
          if (!stateUpdate) {
            return;
          }

          queryClient.setQueryData(["stacks"], (old: Stack[] | undefined) => {
            if (!old) {
              return old;
            }

            return updateContainerInStacks(old, payload.id, stateUpdate) ?? old;
          });
        } catch {
          console.error("Failed to parse WebSocket message:", event.data);
        }
      };

      socket.onclose = () => {
        setStatus("disconnected");

        const delay = Math.min(
          RECONNECT_BASE_DELAY * Math.pow(2, retriesRef.current),
          RECONNECT_MAX_DELAY,
        );

        retriesRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {};
    };

    connect();

    return () => {
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
};

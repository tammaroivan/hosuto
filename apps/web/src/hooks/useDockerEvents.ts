import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Container, Stack } from "@hosuto/shared";
import { computeStackStatus } from "@hosuto/shared";
import { wsUrl } from "../lib/api";

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface DeployOutput {
  stackName: string;
  lines: string[];
  complete: boolean;
  success?: boolean;
}

const ACTION_TO_STATE: Record<string, { status: Container["status"]; state: string }> = {
  start: { status: "running", state: "running" },
  stop: { status: "exited", state: "exited" },
  die: { status: "exited", state: "exited" },
  kill: { status: "exited", state: "exited" },
  pause: { status: "stopped", state: "paused" },
  unpause: { status: "running", state: "running" },
  restart: { status: "running", state: "running" },
};

const getStackStatus = (containers: Container[], expected: number): Stack["status"] => {
  const running = containers.filter(container => container.state === "running").length;
  return computeStackStatus(running, expected);
};

const updateContainerInStacks = (
  stacks: Stack[],
  containerId: string,
  stateUpdate: { status: Container["status"]; state: string },
): Stack[] | null => {
  let changed = false;

  const updated = stacks.map(stack => {
    const idx = stack.containers.findIndex(container => container.id === containerId);
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

    return { ...stack, containers, status: getStackStatus(containers, stack.status.expected) };
  });

  return changed ? updated : null;
};

export const useDockerEvents = () => {
  const queryClient = useQueryClient();
  const wsRef = React.useRef<WebSocket | null>(null);
  const retriesRef = React.useRef(0);
  const reconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = React.useState<ConnectionStatus>("connecting");
  const [lastEvent, setLastEvent] = React.useState<string | null>(null);
  const [deployOutput, setDeployOutput] = React.useState<DeployOutput | null>(null);

  const clearDeployOutput = React.useCallback(() => {
    setDeployOutput(null);
  }, []);

  React.useEffect(() => {
    const connect = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      setStatus("connecting");
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        retriesRef.current = 0;
        setStatus("connected");
      };

      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "stack:output") {
            const { payload } = message;
            setDeployOutput(prev => {
              if (prev && prev.stackName === payload.stackName) {
                return { ...prev, lines: [...prev.lines, payload.line] };
              }

              return { stackName: payload.stackName, lines: [payload.line], complete: false };
            });
            return;
          }

          if (message.type === "stack:action") {
            const { payload } = message;
            setLastEvent(
              `${payload.stackName}: ${payload.action} ${payload.success ? "done" : "failed"}`,
            );
            setDeployOutput(prev => {
              if (prev && prev.stackName === payload.stackName) {
                return { ...prev, complete: true, success: payload.success };
              }

              return prev;
            });
            queryClient.invalidateQueries({ queryKey: ["stacks"] });
            return;
          }

          if (message.type === "stack:updates") {
            queryClient.invalidateQueries({ queryKey: ["stacks"] });
            return;
          }

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

          queryClient.invalidateQueries({
            queryKey: ["container", payload.id],
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

  return { status, lastEvent, deployOutput, clearDeployOutput };
};

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Container, Stack } from "@hosuto/shared";
import { computeStackStatus } from "@hosuto/shared";
import { wsManager } from "../lib/ws";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface DeployLine {
  text: string;
  key?: string;
}

export interface DeployOutput {
  stackName: string;
  lines: DeployLine[];
  complete: boolean;
  success?: boolean;
}

export interface WebSocketContextValue {
  status: ConnectionStatus;
  deployOutput: DeployOutput | null;
  clearDeployOutput: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const WebSocketContext = React.createContext<WebSocketContextValue | null>(null);

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

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<ConnectionStatus>("connecting");
  const [deployOutput, setDeployOutput] = React.useState<DeployOutput | null>(null);

  const clearDeployOutput = React.useCallback(() => {
    setDeployOutput(null);
  }, []);

  React.useEffect(() => {
    wsManager.start();

    const removeStatusListener = wsManager.onStatus(setStatus);

    const removeMessageHandler = wsManager.onMessage(message => {
      switch (message.type) {
        case "stack:output": {
          const { stackName: outputStack, line, key } = message.payload;
          const newLine: DeployLine = { text: line, ...(key && { key }) };

          setDeployOutput(prev => {
            if (prev && prev.stackName === outputStack) {
              if (key) {
                let idx = -1;
                for (let i = prev.lines.length - 1; i >= 0; i--) {
                  if (prev.lines[i].key === key) {
                    idx = i;
                    break;
                  }
                }
                if (idx !== -1) {
                  const lines = [...prev.lines];
                  lines[idx] = newLine;
                  return { ...prev, lines };
                }
              }

              return { ...prev, lines: [...prev.lines, newLine] };
            }

            return { stackName: outputStack, lines: [newLine], complete: false };
          });
          break;
        }

        case "stack:action":
          setDeployOutput(prev => {
            if (prev && prev.stackName === message.payload.stackName) {
              return { ...prev, complete: true, success: message.payload.success };
            }

            return prev;
          });
          queryClient.invalidateQueries({ queryKey: ["stacks"] });
          break;

        case "stack:updates":
          queryClient.invalidateQueries({ queryKey: ["stacks"] });
          break;

        case "stats":
          queryClient.setQueryData(["container-stats"], message.payload);
          break;

        case "container:status": {
          const stateUpdate = ACTION_TO_STATE[message.payload.action];
          if (stateUpdate) {
            queryClient.setQueryData(["stacks"], (old: Stack[] | undefined) => {
              if (!old) {
                return old;
              }

              return updateContainerInStacks(old, message.payload.id, stateUpdate) ?? old;
            });
            queryClient.invalidateQueries({ queryKey: ["container", message.payload.id] });
          }

          break;
        }
      }
    });

    return () => {
      removeStatusListener();
      removeMessageHandler();
      wsManager.stop();
    };
  }, [queryClient]);

  const value = React.useMemo(
    () => ({ status, deployOutput, clearDeployOutput }),
    [status, deployOutput, clearDeployOutput],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

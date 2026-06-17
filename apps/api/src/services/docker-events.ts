import type { WSContext } from "hono/ws";
import type {
  WSContainerStatusMessage,
  WSStackActionMessage,
  WSStackOutputMessage,
} from "@hosuto/shared";
import { docker } from "./docker-client";

const clients = new Set<WSContext>();
let reconnecting = false;

export const addClient = (ws: WSContext): void => {
  clients.add(ws);
};

export const removeClient = (ws: WSContext): void => {
  clients.delete(ws);
};

export const broadcast = (message: string): void => {
  for (const client of clients) {
    try {
      client.send(message);
    } catch {
      clients.delete(client);
    }
  }
};

const CONTAINER_NAME_CONFLICT_RE = /container name "\/?([^"]+)" is already in use/g;

/**
 * Extracts the names of containers that blocked an action because a container with a fixed
 * `container_name` already exists and isn't owned by this Compose project. Docker reports
 * this as `Conflict. The container name "/foo" is already in use ...`. Returns a deduped
 * list (empty when the output carries no such conflict).
 */
export const parseNameConflicts = (output: string | undefined): string[] => {
  if (!output) {
    return [];
  }

  const names = new Set<string>();
  for (const match of output.matchAll(CONTAINER_NAME_CONFLICT_RE)) {
    names.add(match[1]);
  }

  return [...names];
};

export const broadcastStackAction = (
  stackName: string,
  action: string,
  success: boolean,
  error?: string,
  services?: string[],
): void => {
  const conflictContainers = success ? [] : parseNameConflicts(error);
  const message: WSStackActionMessage = {
    type: "stack:action",
    payload: {
      stackName,
      action,
      success,
      error,
      ...(conflictContainers.length > 0 && { conflictContainers }),
      ...(services && services.length > 0 && { services }),
    },
  };
  broadcast(JSON.stringify(message));
};

export const broadcastStackOutput = (stackName: string, line: string, key?: string): void => {
  const message: WSStackOutputMessage = {
    type: "stack:output",
    payload: { stackName, line, ...(key && { key }) },
  };
  broadcast(JSON.stringify(message));
};

export const broadcastStackUpdates = (stackName: string, status: { hasUpdates: boolean }): void => {
  broadcast(
    JSON.stringify({
      type: "stack:updates",
      payload: { stackName, hasUpdates: status.hasUpdates },
    }),
  );
};

export const parseDockerEventChunk = (chunk: string): WSContainerStatusMessage[] => {
  const messages: WSContainerStatusMessage[] = [];
  const lines = chunk.split("\n").filter(Boolean);

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      const containerId = event.Actor?.ID || event.id;

      messages.push({
        type: "container:status",
        payload: {
          id: containerId,
          name: event.Actor?.Attributes?.name || containerId?.slice(0, 12),
          action: event.Action,
          stackName: event.Actor?.Attributes?.["com.docker.compose.project"] || null,
        },
      });
    } catch {
      console.warn("Failed to parse Docker event chunk:", line);
    }
  }

  return messages;
};

export const startDockerEventStream = async (): Promise<void> => {
  reconnecting = false;

  const eventStream = await docker.getEvents({
    filters: {
      type: ["container"],
      event: ["start", "stop", "die", "kill", "pause", "unpause", "restart", "health_status"],
    },
  });

  eventStream.on("data", (chunk: Buffer) => {
    const messages = parseDockerEventChunk(chunk.toString());

    for (const message of messages) {
      broadcast(JSON.stringify(message));
    }
  });

  const reconnect = (reason: string) => {
    if (reconnecting) {
      return;
    }

    reconnecting = true;
    console.error(`Docker event stream ${reason}. Reconnecting in 5s...`);

    setTimeout(() => {
      startDockerEventStream();
    }, 5000);
  };

  eventStream.on("error", () => reconnect("error"));
  eventStream.on("end", () => reconnect("ended"));

  console.log("Docker event stream started");
};

export const startHeartbeat = (intervalMs: number): NodeJS.Timer => {
  return setInterval(() => {
    broadcast(JSON.stringify({ type: "ping" }));
  }, intervalMs);
};

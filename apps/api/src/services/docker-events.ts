import type { WSContext } from "hono/ws";
import { docker } from "./docker-client";

const clients = new Set<WSContext>();
let reconnecting = false;

export function addClient(ws: WSContext): void {
  clients.add(ws);
}

export function removeClient(ws: WSContext): void {
  clients.delete(ws);
}

function broadcast(message: string): void {
  for (const client of clients) {
    try {
      client.send(message);
    } catch {
      clients.delete(client);
    }
  }
}

export async function startDockerEventStream(): Promise<void> {
  reconnecting = false;

  const eventStream = await docker.getEvents({
    filters: {
      type: ["container"],
      event: ["start", "stop", "die", "kill", "pause", "unpause", "restart", "health_status"],
    },
  });

  eventStream.on("data", (chunk: Buffer) => {
    try {
      const event = JSON.parse(chunk.toString());
      const containerId = event.Actor?.ID || event.id;

      broadcast(
        JSON.stringify({
          type: "container:status",
          payload: {
            id: containerId,
            name: event.Actor?.Attributes?.name || containerId?.slice(0, 12),
            action: event.Action,
            stackName: event.Actor?.Attributes?.["com.docker.compose.project"] || null,
          },
        }),
      );
    } catch {
      console.warn("Failed to parse Docker event:", chunk.toString());
    }
  });

  function reconnect(reason: string) {
    if (reconnecting) {
      return;
    }

    reconnecting = true;
    console.error(`Docker event stream ${reason}. Reconnecting in 5s...`);

    setTimeout(() => {
      startDockerEventStream();
    }, 5000);
  }

  eventStream.on("error", () => reconnect("error"));
  eventStream.on("end", () => reconnect("ended"));

  console.log("Docker event stream started");
}

export function startHeartbeat(intervalMs: number): NodeJS.Timer {
  return setInterval(() => {
    broadcast(JSON.stringify({ type: "ping" }));
  }, intervalMs);
}

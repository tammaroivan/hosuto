import { upgradeWebSocket, websocket } from "hono/bun";
import { app } from "./app";
import {
  addClient,
  removeClient,
  startDockerEventStream,
  startHeartbeat,
} from "./services/docker-events";
import { streamContainerLogs } from "./services/docker-logs";
import { WS_HEARTBEAT_INTERVAL } from "@hosuto/shared";

const logCleanups = new Map<object, () => void>();

app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_event, ws) {
      addClient(ws);
    },
    onMessage(event, ws) {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === "subscribe:logs" && message.containerId) {
          const prev = logCleanups.get(ws);
          if (prev) {
            prev();
          }

          const cleanup = streamContainerLogs(
            message.containerId,
            lines => {
              ws.send(
                JSON.stringify({
                  type: "log",
                  payload: { containerId: message.containerId, lines },
                }),
              );
            },
            error => {
              ws.send(
                JSON.stringify({
                  type: "log:error",
                  payload: { containerId: message.containerId, error: error.message },
                }),
              );
            },
          );

          logCleanups.set(ws, cleanup);
        }

        if (message.type === "unsubscribe:logs") {
          const cleanup = logCleanups.get(ws);
          if (cleanup) {
            cleanup();
            logCleanups.delete(ws);
          }
        }
      } catch (error) {
        console.warn("Received invalid WebSocket message:", event.data, error);
      }
    },
    onClose(_event, ws) {
      removeClient(ws);

      const cleanup = logCleanups.get(ws);
      if (cleanup) {
        cleanup();
        logCleanups.delete(ws);
      }
    },
  })),
);

export type { AppType } from "./app";

startDockerEventStream().catch(error => {
  console.error("Failed to start Docker event stream:", error.message);
});
startHeartbeat(WS_HEARTBEAT_INTERVAL);

export default {
  port: parseInt(process.env.PORT || "3000", 10),
  fetch: app.fetch,
  websocket,
};

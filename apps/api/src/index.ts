import { upgradeWebSocket, websocket } from "hono/bun";
import { app } from "./app";
import {
  addClient,
  removeClient,
  startDockerEventStream,
  startHeartbeat,
} from "./services/docker-events";
import { WS_HEARTBEAT_INTERVAL } from "@hosuto/shared";

app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_event, ws) {
      addClient(ws);
    },
    onClose(_event, ws) {
      removeClient(ws);
    },
  })),
);

export type { AppType } from "./app";

startDockerEventStream().catch((error) => {
  console.error("Failed to start Docker event stream:", error.message);
});
startHeartbeat(WS_HEARTBEAT_INTERVAL);

export default {
  port: parseInt(process.env.PORT || "3000", 10),
  fetch: app.fetch,
  websocket,
};

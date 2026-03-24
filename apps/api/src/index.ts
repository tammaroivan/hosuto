import { upgradeWebSocket, websocket } from "hono/bun";
import { app } from "./app";
import { startDockerEventStream, startHeartbeat } from "./services/docker-events";
import { wsEvents } from "./services/ws-handler";
import { WS_HEARTBEAT_INTERVAL } from "@hosuto/shared";

app.get(
  "/ws",
  upgradeWebSocket(() => wsEvents),
);

startDockerEventStream().catch(error => {
  console.error("Failed to start Docker event stream:", error.message);
});

startHeartbeat(WS_HEARTBEAT_INTERVAL);

export default {
  port: parseInt(process.env.PORT || "3000", 10),
  fetch: app.fetch,
  websocket,
};

export type { AppType } from "./app";

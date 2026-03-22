import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { upgradeWebSocket, websocket } from "hono/bun";
import { healthRoute } from "./routes/health";
import { stacksRoute } from "./routes/stacks";
import { containersRoute } from "./routes/containers";
import {
  addClient,
  removeClient,
  startDockerEventStream,
  startHeartbeat,
} from "./services/docker-events";
import { WS_HEARTBEAT_INTERVAL } from "@hosuto/shared";

const isDev = process.env.NODE_ENV !== "production";
const app = new Hono();

app.use("*", logger());

if (isDev) {
  app.use("*", cors());
}

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

// Used for AppType export (Hono RPC pattern)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const routes = app
  .route("/api", healthRoute)
  .route("/api", stacksRoute)
  .route("/api", containersRoute);

export type AppType = typeof routes;

startDockerEventStream().catch((error) => {
  console.error("Failed to start Docker event stream:", error.message);
});
startHeartbeat(WS_HEARTBEAT_INTERVAL);

export default {
  port: parseInt(process.env.PORT || "3000", 10),
  fetch: app.fetch,
  websocket,
};

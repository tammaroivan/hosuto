import { upgradeWebSocket, websocket } from "hono/bun";
import { app } from "./app";
import { broadcast, startDockerEventStream, startHeartbeat } from "./services/docker-events";
import { startStatsCollector } from "./services/docker-stats";
import { startUpdateScheduler } from "./services/update-scheduler";
import { loadSettings } from "./services/settings-store";
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
startStatsCollector(broadcast);

const settings = loadSettings();
startUpdateScheduler(settings.updateCheckInterval);

export default {
  port: parseInt(process.env.PORT || "3000", 10),
  fetch: app.fetch,
  websocket,
};

export type { AppType } from "./app";

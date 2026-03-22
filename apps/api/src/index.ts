import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoute } from "./routes/health";

const isDev = process.env.NODE_ENV !== "production";

const app = new Hono();

app.use("*", logger());

if (isDev) {
  app.use("*", cors());
}

const routes = app.route("/api", healthRoute);

export type AppType = typeof routes;

export default {
  port: parseInt(process.env.PORT || "3000", 10),
  fetch: app.fetch,
};

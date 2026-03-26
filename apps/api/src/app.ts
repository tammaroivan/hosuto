import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoute } from "./routes/health";
import { stacksRoute } from "./routes/stacks";
import { containersRoute } from "./routes/containers";
import { filesRoute } from "./routes/files";

const isDev = process.env.NODE_ENV !== "production";

const app = new Hono();

app.use("*", logger());

if (isDev) {
  app.use("*", cors());
}

app.onError((err, ctx) => {
  console.error("Unhandled error:", err);
  return ctx.json({ error: isDev ? err.message : "Internal server error" }, 500);
});

app.notFound(ctx => {
  return ctx.json({ error: "Not found" }, 404);
});

const routes = app
  .route("/api", healthRoute)
  .route("/api", stacksRoute)
  .route("/api", containersRoute)
  .route("/api", filesRoute);

export type AppType = typeof routes;

export { app, routes };

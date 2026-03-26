import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { healthRoute } from "./routes/health";
import { stacksRoute } from "./routes/stacks";
import { containersRoute } from "./routes/containers";
import { filesRoute } from "./routes/files";
import { settingsRoute } from "./routes/settings";

const isDev = Bun.env.NODE_ENV !== "production";

const app = new Hono();

app.use("*", logger());

if (isDev) {
  app.use("*", cors());
}

app.onError((err, ctx) => {
  console.error("Unhandled error:", err);
  return ctx.json({ error: isDev ? err.message : "Internal server error" }, 500);
});

const routes = app
  .route("/api", healthRoute)
  .route("/api", stacksRoute)
  .route("/api", containersRoute)
  .route("/api", filesRoute)
  .route("/api", settingsRoute);

if (!isDev) {
  const publicDir = join(import.meta.dir, "..", "public");

  app.use("*", async (ctx, next) => {
    const urlPath = ctx.req.path;

    if (urlPath.startsWith("/api") || urlPath === "/ws") {
      return next();
    }

    const filePath = urlPath === "/" ? "/index.html" : urlPath;
    const file = Bun.file(join(publicDir, filePath));

    if (await file.exists()) {
      return new Response(file);
    }

    return new Response(Bun.file(join(publicDir, "index.html")), {
      headers: { "content-type": "text/html" },
    });
  });
}

app.notFound(ctx => {
  return ctx.json({ error: "Not found" }, 404);
});

export type AppType = typeof routes;

export { app, routes };

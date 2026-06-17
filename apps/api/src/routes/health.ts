import { Hono } from "hono";

const VERSION = process.env.APP_VERSION || "dev";

export const healthRoute = new Hono().get("/health", ctx => {
  return ctx.json({ status: "ok", name: "hosuto", version: VERSION });
});

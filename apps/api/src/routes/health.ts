import { Hono } from "hono";

const VERSION = "0.0.1";

export const healthRoute = new Hono().get("/health", ctx => {
  return ctx.json({ status: "ok", name: "hosuto", version: VERSION });
});

import { Hono } from "hono";

export const healthRoute = new Hono().get("/health", ctx => {
  return ctx.json({ status: "ok", name: "hosuto", version: "0.0.1" });
});

import { Hono } from "hono";

export const healthRoute = new Hono().get("/health", (c) => {
  return c.json({ status: "ok", name: "hosuto", version: "0.0.1" });
});

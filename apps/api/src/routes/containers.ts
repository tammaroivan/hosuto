import { Hono } from "hono";
import { validator } from "hono/validator";
import { listContainers, getContainer } from "../services/docker";
import { docker } from "../services/docker-client";
import { getContainerLogs } from "../services/docker-logs";

export const containersRoute = new Hono()
  .get("/containers", async ctx => {
    const containers = await listContainers();
    return ctx.json(containers);
  })
  .get("/containers/:id", async ctx => {
    const containerId = ctx.req.param("id");

    try {
      const container = await getContainer(containerId);
      return ctx.json(container);
    } catch {
      return ctx.json({ error: "Container not found" }, 404);
    }
  })
  .get(
    "/containers/:id/logs",
    validator("query", value => {
      const tail = typeof value["tail"] === "string" ? value["tail"] : "200";
      return { tail };
    }),
    async ctx => {
      const containerId = ctx.req.param("id");
      const { tail } = ctx.req.valid("query");

      try {
        const logs = await getContainerLogs(containerId, parseInt(tail, 10));
        return ctx.json(logs);
      } catch {
        return ctx.json({ error: "Failed to fetch logs" }, 500);
      }
    },
  )
  .post("/containers/:id/start", async ctx => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      container.start();
      return ctx.json({ ok: true });
    } catch {
      return ctx.json({ error: "Failed to start container" }, 500);
    }
  })
  .post("/containers/:id/stop", async ctx => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      container.stop();
      return ctx.json({ ok: true });
    } catch {
      return ctx.json({ error: "Failed to stop container" }, 500);
    }
  })
  .post("/containers/:id/restart", async ctx => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      container.restart();
      return ctx.json({ ok: true });
    } catch {
      return ctx.json({ error: "Failed to restart container" }, 500);
    }
  });

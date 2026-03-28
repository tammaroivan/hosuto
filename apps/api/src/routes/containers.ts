import { Hono } from "hono";
import { validator } from "hono/validator";
import { listContainers, getContainer } from "../services/docker";
import { docker } from "../services/docker-client";
import { getContainerLogs } from "../services/docker-logs";
import { getCachedStats, getContainerStats } from "../services/docker-stats";

export const containersRoute = new Hono()
  .get("/containers", async ctx => {
    const containers = await listContainers();
    return ctx.json(containers);
  })
  .get("/containers/stats", async ctx => {
    const stats = getCachedStats();

    return ctx.json(stats, 200);
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
      } catch (error) {
        console.error("Failed to fetch logs:", error);

        return ctx.json({ error: "Failed to fetch logs" }, 500);
      }
    },
  )
  .get("/containers/:id/stats", async ctx => {
    const containerId = ctx.req.param("id");
    const stats = getContainerStats(containerId);
    if (!stats) {
      return ctx.json({ error: "No stats available" }, 404);
    }

    return ctx.json(stats, 200);
  })
  .post("/containers/:id/start", async ctx => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      await container.start();
      return ctx.json({ ok: true });
    } catch (error) {
      console.error("Failed to start container:", error);
      const message = error instanceof Error ? error.message : "Failed to start container";

      return ctx.json({ error: message }, 500);
    }
  })
  .post("/containers/:id/stop", async ctx => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      await container.stop();
      return ctx.json({ ok: true });
    } catch (error) {
      console.error("Failed to stop container:", error);
      const message = error instanceof Error ? error.message : "Failed to stop container";

      return ctx.json({ error: message }, 500);
    }
  })
  .post("/containers/:id/restart", async ctx => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      await container.restart();
      return ctx.json({ ok: true });
    } catch (error) {
      console.error("Failed to restart container:", error);
      const message = error instanceof Error ? error.message : "Failed to restart container";

      return ctx.json({ error: message }, 500);
    }
  });

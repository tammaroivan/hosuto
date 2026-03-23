import { Hono } from "hono";
import { listContainers, getContainer } from "../services/docker";
import { docker } from "../services/docker-client";

export const containersRoute = new Hono()
  .get("/containers", async (ctx) => {
    const containers = await listContainers();
    return ctx.json(containers);
  })
  .get("/containers/:id", async (ctx) => {
    const containerId = ctx.req.param("id");

    try {
      const container = await getContainer(containerId);
      return ctx.json(container);
    } catch {
      return ctx.json({ error: "Container not found" }, 404);
    }
  })
  .post("/containers/:id/start", async (ctx) => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      await container.start();
      const updated = await getContainer(containerId);
      return ctx.json(updated);
    } catch {
      return ctx.json({ error: "Failed to start container" }, 500);
    }
  })
  .post("/containers/:id/stop", async (ctx) => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      await container.stop();
      const updated = await getContainer(containerId);
      return ctx.json(updated);
    } catch {
      return ctx.json({ error: "Failed to stop container" }, 500);
    }
  })
  .post("/containers/:id/restart", async (ctx) => {
    const containerId = ctx.req.param("id");

    try {
      const container = docker.getContainer(containerId);
      await container.restart();
      const updated = await getContainer(containerId);
      return ctx.json(updated);
    } catch {
      return ctx.json({ error: "Failed to restart container" }, 500);
    }
  });

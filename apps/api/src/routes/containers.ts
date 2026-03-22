import { Hono } from "hono";
import { listContainers, getContainer } from "../services/docker";

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
  });

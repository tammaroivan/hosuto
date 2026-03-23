import { Hono } from "hono";
import { scanStacksDirectory } from "../services/stack-scanner";
import { listContainers, matchContainersToStacks } from "../services/docker";
import { composeUp, composeDown, composeRestart, composePull } from "../services/compose-cli";
import { DEFAULT_STACKS_DIR } from "@hosuto/shared";

const stacksDir = process.env.STACKS_DIR || DEFAULT_STACKS_DIR;

function findStackEntrypoint(name: string): string | null {
  const stacks = scanStacksDirectory(stacksDir);
  const stack = stacks.find((s) => s.name === name);
  return stack?.entrypoint ?? null;
}

export const stacksRoute = new Hono()
  .get("/stacks", async (ctx) => {
    const stacks = scanStacksDirectory(stacksDir);

    try {
      const containers = await listContainers();
      const matched = matchContainersToStacks(stacks, containers);

      return ctx.json(matched);
    } catch (error) {
      console.error("Failed to list containers:", error);

      return ctx.json(stacks);
    }
  })
  .post("/stacks/:name/up", async (ctx) => {
    const entrypoint = findStackEntrypoint(ctx.req.param("name"));
    if (!entrypoint) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    const result = await composeUp(entrypoint);
    if (!result.success) {
      return ctx.json({ error: result.stderr }, 500);
    }

    return ctx.json({ success: true, output: result.stdout });
  })
  .post("/stacks/:name/down", async (ctx) => {
    const entrypoint = findStackEntrypoint(ctx.req.param("name"));
    if (!entrypoint) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    const result = await composeDown(entrypoint);
    if (!result.success) {
      return ctx.json({ error: result.stderr }, 500);
    }

    return ctx.json({ success: true, output: result.stdout });
  })
  .post("/stacks/:name/restart", async (ctx) => {
    const entrypoint = findStackEntrypoint(ctx.req.param("name"));
    if (!entrypoint) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    const result = await composeRestart(entrypoint);
    if (!result.success) {
      return ctx.json({ error: result.stderr }, 500);
    }

    return ctx.json({ success: true, output: result.stdout });
  })
  .post("/stacks/:name/pull", async (ctx) => {
    const entrypoint = findStackEntrypoint(ctx.req.param("name"));
    if (!entrypoint) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    const result = await composePull(entrypoint);
    if (!result.success) {
      return ctx.json({ error: result.stderr }, 500);
    }

    return ctx.json({ success: true, output: result.stdout });
  });

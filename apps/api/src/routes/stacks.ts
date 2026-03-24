import { Hono } from "hono";
import { scanStacksDirectory } from "../services/stack-scanner";
import { listContainers, matchContainersToStacks } from "../services/docker";
import { composeUp, composeDown, composeRestart, composePull } from "../services/compose-cli";
import { broadcastStackAction } from "../services/docker-events";
import { DEFAULT_STACKS_DIR } from "@hosuto/shared";

const stacksDir = process.env.STACKS_DIR || DEFAULT_STACKS_DIR;

const findStackEntrypoint = (name: string): string | null => {
  const stacks = scanStacksDirectory(stacksDir);
  const stack = stacks.find(stack => stack.name === name);
  return stack?.entrypoint ?? null;
};

export const stacksRoute = new Hono()
  .get("/stacks", async ctx => {
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
  .post("/stacks/:name/up", async ctx => {
    const name = ctx.req.param("name");
    const entrypoint = findStackEntrypoint(name);
    if (!entrypoint) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    composeUp(entrypoint).then(result => {
      broadcastStackAction(name, "up", result.success, result.stderr || undefined);
    });

    return ctx.json({ accepted: true }, 202);
  })
  .post("/stacks/:name/down", async ctx => {
    const name = ctx.req.param("name");
    const entrypoint = findStackEntrypoint(name);
    if (!entrypoint) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    composeDown(entrypoint).then(result => {
      broadcastStackAction(name, "down", result.success, result.stderr || undefined);
    });

    return ctx.json({ accepted: true }, 202);
  })
  .post("/stacks/:name/restart", async ctx => {
    const name = ctx.req.param("name");
    const entrypoint = findStackEntrypoint(name);
    if (!entrypoint) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    composeRestart(entrypoint).then(result => {
      broadcastStackAction(name, "restart", result.success, result.stderr || undefined);
    });

    return ctx.json({ accepted: true }, 202);
  })
  .post("/stacks/:name/pull", async ctx => {
    const name = ctx.req.param("name");
    const entrypoint = findStackEntrypoint(name);
    if (!entrypoint) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    composePull(entrypoint).then(result => {
      broadcastStackAction(name, "pull", result.success, result.stderr || undefined);
    });

    return ctx.json({ accepted: true }, 202);
  });

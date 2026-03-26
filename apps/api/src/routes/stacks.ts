import type { Context } from "hono";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { scanStacksDirectory } from "../services/stack-scanner";
import { listContainers, matchContainersToStacks } from "../services/docker";
import { runComposeStreaming } from "../services/compose-cli";
import { broadcastStackAction, broadcastStackOutput } from "../services/docker-events";
import { createStack, StackValidationError, StackConflictError } from "../services/stack-service";
import { DEFAULT_STACKS_DIR } from "@hosuto/shared";

const stacksDir = process.env.STACKS_DIR || DEFAULT_STACKS_DIR;

/**
 * Finds the entrypoint path for a stack by its name.
 */
const findStackEntrypoint = (name: string): string | null => {
  const stacks = scanStacksDirectory(stacksDir);
  const stack = stacks.find(stack => stack.name === name);

  return stack?.entrypoint ?? null;
};

/**
 * Runs a compose command in the background with streaming output.
 * Returns 202 immediately, broadcasts output lines and completion via WebSocket.
 */
const runStackAction = (ctx: Context, action: string, composeArgs: string[]) => {
  const name = ctx.req.param("name");

  if (!name) {
    return ctx.json({ error: "Stack name is required" }, 400);
  }

  const entrypoint = findStackEntrypoint(name);
  if (!entrypoint) {
    return ctx.json({ error: "Stack not found" }, 404);
  }

  runComposeStreaming(entrypoint, composeArgs, line => broadcastStackOutput(name, line))
    .then(result => {
      broadcastStackAction(name, action, result.success, result.stderr || undefined);
    })
    .catch(error => {
      console.error(`Stack action "${action}" failed for "${name}":`, error);
      broadcastStackAction(name, action, false, String(error));
    });

  return ctx.json({ accepted: true }, 202);
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
  .post(
    "/stacks",
    validator("json", (value, ctx) => {
      if (typeof value?.name !== "string" || !value.name) {
        return ctx.json({ error: "Stack name is required" }, 400);
      }

      return { name: value.name };
    }),
    ctx => {
      const { name } = ctx.req.valid("json");

      try {
        const stack = createStack(name, stacksDir);
        return ctx.json(stack, 201);
      } catch (error) {
        if (error instanceof StackConflictError) {
          return ctx.json({ error: error.message }, 409);
        }
        if (error instanceof StackValidationError) {
          return ctx.json({ error: error.message }, 400);
        }

        return ctx.json({ error: "Failed to create stack" }, 500);
      }
    },
  )
  .post("/stacks/:name/up", ctx => runStackAction(ctx, "up", ["up", "-d"]))
  .post("/stacks/:name/down", ctx => runStackAction(ctx, "down", ["down"]))
  .post("/stacks/:name/restart", ctx => runStackAction(ctx, "restart", ["restart"]))
  .post("/stacks/:name/pull", ctx => runStackAction(ctx, "pull", ["pull"]))
  .post("/stacks/:name/build", ctx => runStackAction(ctx, "build", ["build"]))
  .post("/stacks/:name/build-up", ctx => runStackAction(ctx, "build-up", ["up", "-d", "--build"]));

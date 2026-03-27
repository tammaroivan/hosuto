import type { Context } from "hono";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { scanStacksDirectory } from "../services/stack-scanner";
import { listContainers, matchContainersToStacks } from "../services/docker";
import { runComposeStreaming } from "../services/compose-cli";
import {
  broadcastStackAction,
  broadcastStackOutput,
  broadcastStackUpdates,
} from "../services/docker-events";
import { createStack, StackValidationError, StackConflictError } from "../services/stack-service";
import { checkStackUpdates } from "../services/update-checker";
import { getCachedUpdates, setCachedUpdates } from "../services/update-scheduler";
import { DEFAULT_STACKS_DIR, computeStackStatus } from "@hosuto/shared";

const stacksDir = process.env.STACKS_DIR || DEFAULT_STACKS_DIR;

const findStack = (name: string | undefined) => {
  if (!name) {
    return null;
  }

  const stacks = scanStacksDirectory(stacksDir);
  return stacks.find(stack => stack.name === name) ?? null;
};

const runStackAction = (ctx: Context, action: string, composeArgs: string[]) => {
  const name = ctx.req.param("name");
  if (!name) {
    return ctx.json({ error: "Stack name is required" }, 400);
  }

  const stack = findStack(name);
  if (!stack) {
    return ctx.json({ error: "Stack not found" }, 404);
  }

  runComposeStreaming(stack.entrypoint, composeArgs, line => broadcastStackOutput(name, line))
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

      for (const stack of matched) {
        stack.updates = getCachedUpdates(stack.name);
      }

      const matchedIds = new Set(matched.flatMap(stack => stack.containers.map(container => container.id)));
      const standalone = containers.filter(container => !matchedIds.has(container.id));

      if (standalone.length > 0) {
        matched.push({
          name: "standalone",
          entrypoint: "",
          files: [],
          containers: standalone,
          status: computeStackStatus(
            standalone.filter(container => container.state === "running").length,
            standalone.length,
          ),
          hasBuildDirectives: false,
          updates: null,
        });
      }

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
  .post("/stacks/:name/build-up", ctx => runStackAction(ctx, "build-up", ["up", "-d", "--build"]))
  .get("/stacks/:name/updates", ctx => {
    const name = ctx.req.param("name") ?? "";
    const cached = getCachedUpdates(name);

    return ctx.json(
      cached ?? { stackName: name, results: [], lastChecked: null, hasUpdates: false },
      200,
    );
  })
  .post("/stacks/:name/check-updates", async ctx => {
    const name = ctx.req.param("name");
    const stack = findStack(name);
    if (!stack) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    listContainers()
      .then(containers => {
        const matched = matchContainersToStacks([stack], containers);
        return checkStackUpdates(name, matched[0].containers);
      })
      .then(status => {
        setCachedUpdates(name, status);
        broadcastStackUpdates(name, status);
      })
      .catch(err => {
        console.error(`Update check failed for "${name}":`, err);
      });

    return ctx.json({ accepted: true }, 202);
  })
  .post("/stacks/:name/update", ctx => {
    const name = ctx.req.param("name");
    const stack = findStack(name);
    if (!stack) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    const onLine = (line: string) => broadcastStackOutput(name, line);

    runComposeStreaming(stack.entrypoint, ["pull"], onLine)
      .then(pullResult => {
        if (!pullResult.success) {
          throw new Error(pullResult.stderr || "Pull failed");
        }

        return runComposeStreaming(stack.entrypoint, ["up", "-d"], onLine);
      })
      .then(upResult => {
        broadcastStackAction(name, "update", upResult.success, upResult.stderr || undefined);
      })
      .catch(error => {
        broadcastStackAction(name, "update", false, String(error));
      });

    return ctx.json({ accepted: true }, 202);
  });

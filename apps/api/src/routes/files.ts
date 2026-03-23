import { Hono } from "hono";
import { DEFAULT_STACKS_DIR } from "@hosuto/shared";
import {
  getStackFileTree,
  getFileContent,
  writeFile,
  validateCompose,
  applyCompose,
  PathSecurityError,
} from "../services/file-service";

const stacksDir = process.env.STACKS_DIR || DEFAULT_STACKS_DIR;

export const filesRoute = new Hono()
  .get("/files/:stackName", (ctx) => {
    const stackName = ctx.req.param("stackName");
    const tree = getStackFileTree(stackName, stacksDir);

    if (!tree) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    return ctx.json(tree);
  })
  .get("/files/:stackName/*", (ctx) => {
    const stackName = ctx.req.param("stackName");
    const relativePath = ctx.req.param("*") ?? "";

    if (!relativePath) {
      return ctx.json({ error: "File path required" }, 400);
    }

    try {
      const file = getFileContent(stackName, relativePath, stacksDir);

      if (!file) {
        return ctx.json({ error: "File not found" }, 404);
      }

      return ctx.json(file);
    } catch (err) {
      if (err instanceof PathSecurityError) {
        return ctx.json({ error: "Invalid file path" }, 403);
      }

      return ctx.json({ error: (err as Error).message }, 400);
    }
  })
  .put("/files/:stackName/*", async (ctx) => {
    const stackName = ctx.req.param("stackName");
    const relativePath = ctx.req.param("*") ?? "";

    if (!relativePath) {
      return ctx.json({ error: "File path required" }, 400);
    }

    const body = await ctx.req.json<{ content: string }>();
    if (typeof body?.content !== "string") {
      return ctx.json({ error: "Request body must include 'content' string" }, 400);
    }

    try {
      const result = writeFile(stackName, relativePath, body.content, stacksDir);
      return ctx.json(result);
    } catch (err) {
      if (err instanceof PathSecurityError) {
        return ctx.json({ error: "Invalid file path" }, 403);
      }

      return ctx.json({ error: (err as Error).message }, 400);
    }
  })
  .post("/files/:stackName/validate", async (ctx) => {
    const stackName = ctx.req.param("stackName");
    const result = await validateCompose(stackName, stacksDir);

    if (!result) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    return ctx.json(result);
  })
  .post("/files/:stackName/apply", async (ctx) => {
    const stackName = ctx.req.param("stackName");
    const result = await applyCompose(stackName, stacksDir);

    if (!result) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    if (!result.success) {
      return ctx.json({ error: result.stderr }, 500);
    }

    return ctx.json({ success: true, output: result.stdout });
  });

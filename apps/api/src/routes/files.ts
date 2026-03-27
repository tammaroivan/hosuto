import { Hono } from "hono";
import { validator } from "hono/validator";
import { DEFAULT_STACKS_DIR } from "@hosuto/shared";
import {
  getStackFileTree,
  getFileContent,
  writeFile,
  validateCompose,
  applyCompose,
  renameFile,
  PathSecurityError,
} from "../services/file-service";

const stacksDir = Bun.env.STACKS_DIR || DEFAULT_STACKS_DIR;

export const filesRoute = new Hono()
  .get("/files/:stackName", ctx => {
    const stackName = ctx.req.param("stackName");
    const tree = getStackFileTree(stackName, stacksDir);

    if (!tree) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    return ctx.json(tree, 200);
  })
  .get(
    "/files/:stackName/content",
    validator("query", (value, ctx) => {
      if (typeof value?.path !== "string" || !value.path) {
        return ctx.json({ error: "File path required" }, 400);
      }

      return { path: value.path };
    }),
    ctx => {
      const stackName = ctx.req.param("stackName");
      const { path: relativePath } = ctx.req.valid("query");

      try {
        const file = getFileContent(stackName, relativePath, stacksDir);

        if (!file) {
          return ctx.json({ error: "File not found" }, 404);
        }

        return ctx.json(file, 200);
      } catch (err) {
        if (err instanceof PathSecurityError) {
          return ctx.json({ error: "Invalid file path" }, 403);
        }

        return ctx.json({ error: err instanceof Error ? err.message : "Unknown error" }, 400);
      }
    },
  )
  .put(
    "/files/:stackName/content",
    validator("json", (value, ctx) => {
      if (typeof value?.content !== "string") {
        return ctx.json({ error: "Request body must include 'content' string" }, 400);
      }
      if (typeof value?.path !== "string" || !value.path) {
        return ctx.json({ error: "Request body must include 'path' string" }, 400);
      }

      return { content: value.content, path: value.path as string };
    }),
    async ctx => {
      const stackName = ctx.req.param("stackName");
      const { path: relativePath, content } = ctx.req.valid("json");

      try {
        const result = writeFile(stackName, relativePath, content, stacksDir);
        return ctx.json(result, 200);
      } catch (err) {
        if (err instanceof PathSecurityError) {
          return ctx.json({ error: "Invalid file path" }, 403);
        }

        return ctx.json({ error: err instanceof Error ? err.message : "Unknown error" }, 400);
      }
    },
  )
  .post(
    "/files/:stackName/validate",
    validator("json", value => {
      const files = value?.files && typeof value.files === "object" ? value.files : {};
      return { files: files as Record<string, string> };
    }),
    async ctx => {
      const stackName = ctx.req.param("stackName");
      const { files } = ctx.req.valid("json");
      const overrides = Object.keys(files).length > 0 ? files : undefined;
      const result = await validateCompose(stackName, stacksDir, overrides);

      if (!result) {
        return ctx.json({ error: "Stack not found" }, 404);
      }

      return ctx.json(result, 200);
    },
  )
  .post("/files/:stackName/apply", async ctx => {
    const stackName = ctx.req.param("stackName");
    const result = await applyCompose(stackName, stacksDir);

    if (!result) {
      return ctx.json({ error: "Stack not found" }, 404);
    }

    if (!result.success) {
      return ctx.json({ error: result.stderr }, 500);
    }

    return ctx.json({ success: true, output: result.stdout }, 200);
  })
  .post(
    "/files/:stackName/rename",
    validator("json", value => {
      const oldPath = typeof value?.oldPath === "string" ? value.oldPath : "";
      const newPath = typeof value?.newPath === "string" ? value.newPath : "";
      return { oldPath, newPath };
    }),
    async ctx => {
      const stackName = ctx.req.param("stackName");
      const { oldPath, newPath } = ctx.req.valid("json");

      if (!oldPath || !newPath) {
        return ctx.json({ error: "Both oldPath and newPath are required" }, 400);
      }

      try {
        const result = renameFile(stackName, oldPath, newPath, stacksDir);
        return ctx.json(result, 200);
      } catch (err) {
        if (err instanceof PathSecurityError) {
          return ctx.json({ error: "Invalid file path" }, 403);
        }

        return ctx.json({ error: err instanceof Error ? err.message : "Unknown error" }, 400);
      }
    },
  );

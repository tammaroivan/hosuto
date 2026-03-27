import { Hono } from "hono";
import { validator } from "hono/validator";
import { loadSettings, saveSettings } from "../services/settings-store";
import { startUpdateScheduler } from "../services/update-scheduler";

export const settingsRoute = new Hono()
  .get("/settings", ctx => {
    const settings = loadSettings();

    return ctx.json(
      {
        updateCheckInterval: settings.updateCheckInterval,
        stacksDir: Bun.env.STACKS_DIR || "/stacks",
        dockerSocket: Bun.env.DOCKER_SOCKET || "/var/run/docker.sock",
      },
      200,
    );
  })
  .put(
    "/settings",
    validator("json", (value, ctx) => {
      if (value?.updateCheckInterval !== undefined) {
        const interval = Number(value.updateCheckInterval);
        if (isNaN(interval) || interval < 60) {
          return ctx.json({ error: "Update interval must be at least 60 seconds" }, 400);
        }

        return { updateCheckInterval: interval };
      }

      return {};
    }),
    ctx => {
      const body = ctx.req.valid("json");
      const updated = saveSettings(body);

      if (body.updateCheckInterval !== undefined) {
        startUpdateScheduler(body.updateCheckInterval);
      }

      return ctx.json({ updateCheckInterval: updated.updateCheckInterval }, 200);
    },
  );

import { Hono } from "hono";
import { scanStacksDirectory } from "../services/stack-scanner";
import { listContainers, matchContainersToStacks } from "../services/docker";
import { DEFAULT_STACKS_DIR } from "@hosuto/shared";

const stacksDir = process.env.STACKS_DIR || DEFAULT_STACKS_DIR;

export const stacksRoute = new Hono().get("/stacks", async (ctx) => {
  const stacks = scanStacksDirectory(stacksDir);

  try {
    const containers = await listContainers();
    const matched = matchContainersToStacks(stacks, containers);

    return ctx.json(matched);
  } catch (error) {
    console.error("Failed to list containers:", error);

    return ctx.json(stacks);
  }
});

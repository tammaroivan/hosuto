import { Hono } from "hono";
import { scanStacksDirectory } from "../services/stack-scanner";
import { DEFAULT_STACKS_DIR } from "@hosuto/shared";

const stacksDir = process.env.STACKS_DIR || DEFAULT_STACKS_DIR;

export const stacksRoute = new Hono().get("/stacks", (c) => {
  const stacks = scanStacksDirectory(stacksDir);
  return c.json(stacks);
});

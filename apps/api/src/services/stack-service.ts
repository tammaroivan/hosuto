import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { scanStacksDirectory } from "./stack-scanner";
import type { Stack } from "@hosuto/shared";

const STACK_NAME_REGEX = /^[a-z0-9][a-z0-9-]*$/;
const MAX_NAME_LENGTH = 64;

const TEMPLATE = `services:
  app:
    image: hello-world
`;

export class StackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StackValidationError";
  }
}

export class StackConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StackConflictError";
  }
}

export const createStack = (name: string, stacksDir: string): Stack => {
  const trimmed = name.trim();

  if (!trimmed || trimmed.length > MAX_NAME_LENGTH) {
    throw new StackValidationError(`Stack name must be 1-${MAX_NAME_LENGTH} characters`);
  }

  if (!STACK_NAME_REGEX.test(trimmed)) {
    throw new StackValidationError(
      "Stack name must be lowercase alphanumeric with hyphens, starting with a letter or number",
    );
  }

  const stackDir = resolve(stacksDir, trimmed);

  if (existsSync(stackDir)) {
    throw new StackConflictError(`Stack "${trimmed}" already exists`);
  }

  mkdirSync(stackDir, { recursive: true });
  writeFileSync(join(stackDir, "compose.yml"), TEMPLATE, "utf-8");

  const stacks = scanStacksDirectory(stacksDir);
  const created = stacks.find(stack => stack.name === trimmed);

  if (!created) {
    throw new Error("Stack was created but could not be found by scanner");
  }

  return created;
};

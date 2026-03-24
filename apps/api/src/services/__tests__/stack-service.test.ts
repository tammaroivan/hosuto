import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createStack, StackValidationError, StackConflictError } from "../stack-service";

const TEST_DIR = join(import.meta.dirname, "__fixtures_stack_service__");

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("createStack", () => {
  it("creates a directory with compose.yml", () => {
    const stack = createStack("my-app", TEST_DIR);

    expect(stack.name).toBe("my-app");
    expect(existsSync(join(TEST_DIR, "my-app"))).toBe(true);
    expect(existsSync(join(TEST_DIR, "my-app/compose.yml"))).toBe(true);

    const content = readFileSync(join(TEST_DIR, "my-app/compose.yml"), "utf-8");
    expect(content).toContain("services:");
  });

  it("returns a stack with the correct entrypoint", () => {
    const stack = createStack("web", TEST_DIR);

    expect(stack.entrypoint).toBe(join(TEST_DIR, "web/compose.yml"));
    expect(stack.files.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects empty names", () => {
    expect(() => createStack("", TEST_DIR)).toThrow(StackValidationError);
    expect(() => createStack("   ", TEST_DIR)).toThrow(StackValidationError);
  });

  it("rejects names with uppercase letters", () => {
    expect(() => createStack("MyApp", TEST_DIR)).toThrow(StackValidationError);
  });

  it("rejects names with spaces", () => {
    expect(() => createStack("my app", TEST_DIR)).toThrow(StackValidationError);
  });

  it("rejects names starting with a hyphen", () => {
    expect(() => createStack("-bad", TEST_DIR)).toThrow(StackValidationError);
  });

  it("rejects names longer than 64 characters", () => {
    const longName = "a".repeat(65);
    expect(() => createStack(longName, TEST_DIR)).toThrow(StackValidationError);
  });

  it("allows names with hyphens and numbers", () => {
    const stack = createStack("my-app-2", TEST_DIR);
    expect(stack.name).toBe("my-app-2");
  });

  it("throws StackConflictError if directory already exists", () => {
    mkdirSync(join(TEST_DIR, "existing"), { recursive: true });

    expect(() => createStack("existing", TEST_DIR)).toThrow(StackConflictError);
  });

  it("trims whitespace from the name", () => {
    const stack = createStack("  my-app  ", TEST_DIR);
    expect(stack.name).toBe("my-app");
  });
});

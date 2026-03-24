import { describe, it, expect } from "vitest";
import { runComposeStreaming } from "../compose-cli";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const TEST_DIR = join(import.meta.dirname, "__fixtures_compose_streaming__");

describe("runComposeStreaming", () => {
  it("streams output lines and returns result", async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    const entrypoint = join(TEST_DIR, "compose.yml");
    writeFileSync(entrypoint, "services:\n  app:\n    image: hello-world\n");

    const lines: string[] = [];
    const result = await runComposeStreaming(entrypoint, ["config"], line => {
      lines.push(line);
    });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain("services:");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some(line => line.includes("hello-world"))).toBe(true);

    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("returns failure for invalid compose file", async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    const entrypoint = join(TEST_DIR, "bad.yml");
    writeFileSync(entrypoint, "not valid yaml: [[[");

    const lines: string[] = [];
    const result = await runComposeStreaming(entrypoint, ["config"], line => {
      lines.push(line);
    });

    expect(result.success).toBe(false);

    rmSync(TEST_DIR, { recursive: true, force: true });
  });
});

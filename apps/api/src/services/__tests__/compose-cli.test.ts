import { describe, it, expect, vi, beforeEach } from "vitest";
import { composeUp, composeDown, composeRestart, composePull } from "../compose-cli";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";

const mockExecFile = vi.mocked(execFile);

const setupExecFile = (error: Error | null, stdout = "", stderr = "") => {
  mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
    callback?.(error, stdout, stderr);
    return {} as ReturnType<typeof execFile>;
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("composeUp", () => {
  it("runs docker compose up -d", async () => {
    setupExecFile(null, "Container started\n");

    const result = await composeUp("/stacks/myapp/docker-compose.yml");

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Container started\n");
    expect(mockExecFile).toHaveBeenCalledWith(
      "docker",
      ["compose", "-f", "/stacks/myapp/docker-compose.yml", "up", "-d"],
      { cwd: "/stacks/myapp" },
      expect.any(Function),
    );
  });

  it("passes specific services when provided", async () => {
    setupExecFile(null);

    await composeUp("/stacks/myapp/docker-compose.yml", ["web", "db"]);

    expect(mockExecFile).toHaveBeenCalledWith(
      "docker",
      ["compose", "-f", "/stacks/myapp/docker-compose.yml", "up", "-d", "web", "db"],
      { cwd: "/stacks/myapp" },
      expect.any(Function),
    );
  });

  it("returns failure on error", async () => {
    setupExecFile(new Error("exit code 1"), "", "Error: no such service\n");

    const result = await composeUp("/stacks/myapp/docker-compose.yml");

    expect(result.success).toBe(false);
    expect(result.stderr).toBe("Error: no such service\n");
  });
});

describe("composeDown", () => {
  it("runs docker compose down", async () => {
    setupExecFile(null, "Stopped\n");

    const result = await composeDown("/stacks/myapp/docker-compose.yml");

    expect(result.success).toBe(true);
    expect(mockExecFile).toHaveBeenCalledWith(
      "docker",
      ["compose", "-f", "/stacks/myapp/docker-compose.yml", "down"],
      { cwd: "/stacks/myapp" },
      expect.any(Function),
    );
  });

  it("returns failure on error", async () => {
    setupExecFile(new Error("exit code 1"), "", "network not found\n");

    const result = await composeDown("/stacks/myapp/docker-compose.yml");

    expect(result.success).toBe(false);
    expect(result.stderr).toBe("network not found\n");
  });
});

describe("composeRestart", () => {
  it("runs docker compose restart", async () => {
    setupExecFile(null);

    const result = await composeRestart("/stacks/myapp/docker-compose.yml");

    expect(result.success).toBe(true);
    expect(mockExecFile).toHaveBeenCalledWith(
      "docker",
      ["compose", "-f", "/stacks/myapp/docker-compose.yml", "restart"],
      { cwd: "/stacks/myapp" },
      expect.any(Function),
    );
  });
});

describe("composePull", () => {
  it("runs docker compose pull", async () => {
    setupExecFile(null, "Pulled\n");

    const result = await composePull("/stacks/myapp/docker-compose.yml");

    expect(result.success).toBe(true);
    expect(mockExecFile).toHaveBeenCalledWith(
      "docker",
      ["compose", "-f", "/stacks/myapp/docker-compose.yml", "pull"],
      { cwd: "/stacks/myapp" },
      expect.any(Function),
    );
  });

  it("passes specific services when provided", async () => {
    setupExecFile(null);

    await composePull("/stacks/myapp/docker-compose.yml", ["nginx"]);

    expect(mockExecFile).toHaveBeenCalledWith(
      "docker",
      ["compose", "-f", "/stacks/myapp/docker-compose.yml", "pull", "nginx"],
      { cwd: "/stacks/myapp" },
      expect.any(Function),
    );
  });

  it("returns failure when pull fails", async () => {
    setupExecFile(new Error("exit code 1"), "", "manifest unknown\n");

    const result = await composePull("/stacks/myapp/docker-compose.yml");

    expect(result.success).toBe(false);
    expect(result.stderr).toBe("manifest unknown\n");
  });
});

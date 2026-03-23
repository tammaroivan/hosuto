import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Stack, FileContent, StackFileTree, FileValidationResult } from "@hosuto/shared";
import { app } from "../app";
import { makeStack } from "./factories";

const mockScan = vi.hoisted(() => vi.fn<() => Stack[]>());

const mockFileService = vi.hoisted(() => ({
  getStackFileTree: vi.fn<() => StackFileTree | null>(),
  getFileContent: vi.fn<() => FileContent | null>(),
  writeFile: vi.fn<() => FileContent>(),
  validateCompose: vi.fn<() => Promise<FileValidationResult | null>>(),
  applyCompose: vi.fn<() => Promise<{ success: boolean; stdout: string; stderr: string } | null>>(),
  PathSecurityError: class PathSecurityError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PathSecurityError";
    }
  },
}));

vi.mock("../services/stack-scanner", () => ({
  scanStacksDirectory: (...args: unknown[]) => mockScan(...(args as [])),
}));

vi.mock("../services/file-service", () => ({
  getStackFileTree: (...args: unknown[]) => mockFileService.getStackFileTree(...(args as [])),
  getFileContent: (...args: unknown[]) => mockFileService.getFileContent(...(args as [])),
  writeFile: (...args: unknown[]) => mockFileService.writeFile(...(args as [])),
  validateCompose: (...args: unknown[]) => mockFileService.validateCompose(...(args as [])),
  applyCompose: (...args: unknown[]) => mockFileService.applyCompose(...(args as [])),
  PathSecurityError: mockFileService.PathSecurityError,
}));

const defaultFileContent: FileContent = {
  path: "/stacks/mystack/docker-compose.yml",
  relativePath: "docker-compose.yml",
  content: "services:\n  web:\n    image: nginx\n",
  type: "compose",
  size: 100,
  lastModified: "2026-01-15T10:00:00.000Z",
};

const defaultFileTree: StackFileTree = {
  stackName: "mystack",
  stackDir: "/stacks/mystack",
  entrypoint: "/stacks/mystack/docker-compose.yml",
  files: [
    {
      path: "/stacks/mystack/docker-compose.yml",
      relativePath: "docker-compose.yml",
      name: "docker-compose.yml",
      type: "compose",
      content: "services:\n  web:\n    image: nginx\n",
      includedBy: null,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockScan.mockReturnValue([makeStack()]);
  mockFileService.getStackFileTree.mockReturnValue(defaultFileTree);
  mockFileService.getFileContent.mockReturnValue(defaultFileContent);
  mockFileService.writeFile.mockReturnValue(defaultFileContent);
});

describe("GET /api/files/:stackName", () => {
  it("returns file tree for a valid stack", async () => {
    const res = await app.request("/api/files/mystack");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stackName).toBe("mystack");
    expect(body.files).toHaveLength(1);
    expect(body.files[0].name).toBe("docker-compose.yml");
    expect(body.files[0].type).toBe("compose");
  });

  it("returns 404 for unknown stack", async () => {
    mockFileService.getStackFileTree.mockReturnValue(null);

    const res = await app.request("/api/files/unknown");

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stack not found");
  });
});

describe("POST /api/files/:stackName/validate", () => {
  it("returns valid result for correct compose file", async () => {
    mockFileService.validateCompose.mockResolvedValue({
      valid: true,
      output: "services:\n  web:\n    image: nginx\n",
      errors: "",
    });

    const res = await app.request("/api/files/mystack/validate", { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.output).toContain("nginx");
    expect(body.errors).toBe("");
  });

  it("returns invalid result with errors", async () => {
    mockFileService.validateCompose.mockResolvedValue({
      valid: false,
      output: "",
      errors: "service 'web' has invalid key 'foo'\n",
    });

    const res = await app.request("/api/files/mystack/validate", { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.errors).toContain("invalid key");
  });

  it("returns 404 for unknown stack", async () => {
    mockFileService.validateCompose.mockResolvedValue(null);

    const res = await app.request("/api/files/unknown/validate", { method: "POST" });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/files/:stackName/apply", () => {
  it("runs compose up and returns success", async () => {
    mockFileService.applyCompose.mockResolvedValue({
      success: true,
      stdout: "Container mystack-web-1  Started\n",
      stderr: "",
    });

    const res = await app.request("/api/files/mystack/apply", { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.output).toContain("Started");
  });

  it("returns 500 when compose up fails", async () => {
    mockFileService.applyCompose.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "service web failed to start\n",
    });

    const res = await app.request("/api/files/mystack/apply", { method: "POST" });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("failed to start");
  });

  it("returns 404 for unknown stack", async () => {
    mockFileService.applyCompose.mockResolvedValue(null);

    const res = await app.request("/api/files/unknown/apply", { method: "POST" });

    expect(res.status).toBe(404);
  });
});

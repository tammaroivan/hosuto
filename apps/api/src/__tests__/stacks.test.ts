import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Stack } from "@hosuto/shared";
import { app } from "../app";
import { makeComposeFile, makeContainerInfo, makeStack } from "./factories";

const mockDocker = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getContainer: vi.fn(),
}));

const mockScan = vi.hoisted(() => vi.fn<() => Stack[]>());

const mockCompose = vi.hoisted(() => ({
  runComposeStreaming: vi.fn(),
}));

const mockEvents = vi.hoisted(() => ({
  broadcastStackAction: vi.fn(),
  broadcastStackOutput: vi.fn(),
  broadcastStackUpdates: vi.fn(),
}));

vi.mock("../services/docker-client", () => ({
  docker: mockDocker,
}));

vi.mock("../services/stack-scanner", () => ({
  scanStacksDirectory: (...args: unknown[]) => mockScan(...(args as [])),
}));

vi.mock("../services/compose-cli", () => ({
  runComposeStreaming: (...args: unknown[]) => mockCompose.runComposeStreaming(...args),
}));

vi.mock("../services/docker-events", async importOriginal => {
  const actual = await importOriginal<typeof import("../services/docker-events")>();
  return {
    ...actual,
    broadcastStackAction: (...args: unknown[]) => mockEvents.broadcastStackAction(...args),
    broadcastStackOutput: (...args: unknown[]) => mockEvents.broadcastStackOutput(...args),
    broadcastStackUpdates: (...args: unknown[]) => mockEvents.broadcastStackUpdates(...args),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockDocker.listContainers.mockResolvedValue([]);
});

describe("GET /api/stacks", () => {
  it("returns stacks with matched containers", async () => {
    mockScan.mockReturnValue([
      makeStack({ files: [makeComposeFile({ services: ["web"] })] }),
      makeStack({ name: "media" }),
    ]);
    mockDocker.listContainers.mockResolvedValue([
      makeContainerInfo({
        Id: "c1",
        Names: ["/web"],
        Labels: {
          "com.docker.compose.project": "mystack",
          "com.docker.compose.service": "web",
        },
      }),
    ]);

    const res = await app.request("/api/stacks");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("mystack");
    expect(body[0].containers).toHaveLength(1);
    expect(body[0].status.state).toBe("running");
    expect(body[1].name).toBe("media");
    expect(body[1].containers).toHaveLength(0);
  });

  it("returns empty array when no stacks found", async () => {
    mockScan.mockReturnValue([]);

    const res = await app.request("/api/stacks");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("sets status to partial when some containers are stopped", async () => {
    mockScan.mockReturnValue([makeStack({ files: [makeComposeFile({ services: ["web", "db"] })] })]);
    mockDocker.listContainers.mockResolvedValue([
      makeContainerInfo({
        Id: "c1",
        Names: ["/web"],
        State: "running",
        Status: "Up 1 hour",
        Labels: {
          "com.docker.compose.project": "mystack",
          "com.docker.compose.service": "web",
        },
      }),
      makeContainerInfo({
        Id: "c2",
        Names: ["/db"],
        State: "exited",
        Status: "Exited (0)",
        Labels: {
          "com.docker.compose.project": "mystack",
          "com.docker.compose.service": "db",
        },
      }),
    ]);

    const res = await app.request("/api/stacks");

    const body = await res.json();
    expect(body[0].status.state).toBe("partial");
    expect(body[0].containers).toHaveLength(2);
  });

  it("sets status to stopped when all containers are stopped", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockDocker.listContainers.mockResolvedValue([
      makeContainerInfo({ Id: "c1", Names: ["/web"], State: "exited", Status: "Exited (0)" }),
      makeContainerInfo({ Id: "c2", Names: ["/db"], State: "exited", Status: "Exited (1)" }),
    ]);

    const res = await app.request("/api/stacks");

    const body = await res.json();
    expect(body[0].status.state).toBe("stopped");
  });

  it("does not assign containers to wrong stack", async () => {
    mockScan.mockReturnValue([makeStack(), makeStack({ name: "other" })]);
    mockDocker.listContainers.mockResolvedValue([
      makeContainerInfo({
        Id: "c1",
        Names: ["/nginx"],
        Labels: { "com.docker.compose.project": "other" },
      }),
    ]);

    const res = await app.request("/api/stacks");

    const body = await res.json();
    expect(body[0].name).toBe("mystack");
    expect(body[0].containers).toHaveLength(0);
    expect(body[1].name).toBe("other");
    expect(body[1].containers).toHaveLength(1);
  });

  it("returns stacks without containers on docker error", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockDocker.listContainers.mockRejectedValue(new Error("socket error"));

    const res = await app.request("/api/stacks");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].containers).toHaveLength(0);
    expect(body[0].status.state).toBe("stopped");
  });
});

describe("POST /api/stacks/:name/up", () => {
  it("accepts and streams compose up for the stack", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.runComposeStreaming.mockResolvedValue({
      success: true,
      stdout: "Started\n",
      stderr: "",
    });

    const res = await app.request("/api/stacks/mystack/up", { method: "POST" });

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: true });
    expect(mockCompose.runComposeStreaming).toHaveBeenCalledWith(
      "/stacks/mystack/docker-compose.yml",
      ["up", "-d"],
      expect.any(Function),
    );
    await vi.waitFor(() =>
      expect(mockEvents.broadcastStackAction).toHaveBeenCalledWith("mystack", "up", true, undefined),
    );
  });

  it("returns 404 for unknown stack", async () => {
    mockScan.mockReturnValue([]);

    const res = await app.request("/api/stacks/unknown/up", { method: "POST" });

    expect(res.status).toBe(404);
    expect(mockCompose.runComposeStreaming).not.toHaveBeenCalled();
  });

  it("broadcasts failure when compose fails", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.runComposeStreaming.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "error\n",
    });

    const res = await app.request("/api/stacks/mystack/up", { method: "POST" });

    expect(res.status).toBe(202);
    await vi.waitFor(() =>
      expect(mockEvents.broadcastStackAction).toHaveBeenCalledWith(
        "mystack",
        "up",
        false,
        "error\n",
      ),
    );
  });
});

describe("POST /api/stacks/:name/down", () => {
  it("accepts and streams compose down for the stack", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.runComposeStreaming.mockResolvedValue({
      success: true,
      stdout: "Stopped\n",
      stderr: "",
    });

    const res = await app.request("/api/stacks/mystack/down", { method: "POST" });

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: true });
    expect(mockCompose.runComposeStreaming).toHaveBeenCalledWith(
      "/stacks/mystack/docker-compose.yml",
      ["down"],
      expect.any(Function),
    );
    await vi.waitFor(() =>
      expect(mockEvents.broadcastStackAction).toHaveBeenCalledWith(
        "mystack",
        "down",
        true,
        undefined,
      ),
    );
  });

  it("returns 404 for unknown stack", async () => {
    mockScan.mockReturnValue([]);

    const res = await app.request("/api/stacks/unknown/down", { method: "POST" });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stack not found");
  });

  it("broadcasts failure when compose fails", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.runComposeStreaming.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "network mystack_default not found\n",
    });

    const res = await app.request("/api/stacks/mystack/down", { method: "POST" });

    expect(res.status).toBe(202);
    await vi.waitFor(() =>
      expect(mockEvents.broadcastStackAction).toHaveBeenCalledWith(
        "mystack",
        "down",
        false,
        "network mystack_default not found\n",
      ),
    );
  });
});

describe("POST /api/stacks/:name/restart", () => {
  it("accepts and streams compose restart for the stack", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.runComposeStreaming.mockResolvedValue({ success: true, stdout: "", stderr: "" });

    const res = await app.request("/api/stacks/mystack/restart", { method: "POST" });

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: true });
    expect(mockCompose.runComposeStreaming).toHaveBeenCalledWith(
      "/stacks/mystack/docker-compose.yml",
      ["restart"],
      expect.any(Function),
    );
    await vi.waitFor(() =>
      expect(mockEvents.broadcastStackAction).toHaveBeenCalledWith(
        "mystack",
        "restart",
        true,
        undefined,
      ),
    );
  });

  it("returns 404 for unknown stack", async () => {
    mockScan.mockReturnValue([]);

    const res = await app.request("/api/stacks/unknown/restart", { method: "POST" });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stack not found");
  });

  it("broadcasts failure when compose fails", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.runComposeStreaming.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "no containers to restart\n",
    });

    const res = await app.request("/api/stacks/mystack/restart", { method: "POST" });

    expect(res.status).toBe(202);
    await vi.waitFor(() =>
      expect(mockEvents.broadcastStackAction).toHaveBeenCalledWith(
        "mystack",
        "restart",
        false,
        "no containers to restart\n",
      ),
    );
  });
});

describe("POST /api/stacks/:name/pull", () => {
  it("accepts and streams compose pull for the stack", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.runComposeStreaming.mockResolvedValue({
      success: true,
      stdout: "Pulled\n",
      stderr: "",
    });

    const res = await app.request("/api/stacks/mystack/pull", { method: "POST" });

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ accepted: true });
    expect(mockCompose.runComposeStreaming).toHaveBeenCalledWith(
      "/stacks/mystack/docker-compose.yml",
      ["pull"],
      expect.any(Function),
    );
    await vi.waitFor(() =>
      expect(mockEvents.broadcastStackAction).toHaveBeenCalledWith(
        "mystack",
        "pull",
        true,
        undefined,
      ),
    );
  });

  it("returns 404 for unknown stack", async () => {
    mockScan.mockReturnValue([makeStack()]);

    const res = await app.request("/api/stacks/other/pull", { method: "POST" });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stack not found");
  });

  it("broadcasts failure when pull fails", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.runComposeStreaming.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "manifest unknown\n",
    });

    const res = await app.request("/api/stacks/mystack/pull", { method: "POST" });

    expect(res.status).toBe(202);
    await vi.waitFor(() =>
      expect(mockEvents.broadcastStackAction).toHaveBeenCalledWith(
        "mystack",
        "pull",
        false,
        "manifest unknown\n",
      ),
    );
  });

  it("uses correct entrypoint for stack with custom path", async () => {
    mockScan.mockReturnValue([
      makeStack({
        name: "media",
        entrypoint: "/stacks/media/compose.yml",
      }),
    ]);
    mockCompose.runComposeStreaming.mockResolvedValue({ success: true, stdout: "", stderr: "" });

    const res = await app.request("/api/stacks/media/pull", { method: "POST" });

    expect(res.status).toBe(202);
    expect(mockCompose.runComposeStreaming).toHaveBeenCalledWith(
      "/stacks/media/compose.yml",
      ["pull"],
      expect.any(Function),
    );
  });
});

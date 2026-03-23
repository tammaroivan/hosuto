import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Stack } from "@hosuto/shared";
import { app } from "../app";
import { makeContainerInfo, makeStack } from "./factories";

const mockDocker = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getContainer: vi.fn(),
}));

const mockScan = vi.hoisted(() => vi.fn<() => Stack[]>());

const mockCompose = vi.hoisted(() => ({
  composeUp: vi.fn(),
  composeDown: vi.fn(),
  composeRestart: vi.fn(),
  composePull: vi.fn(),
}));

vi.mock("../services/docker-client", () => ({
  docker: mockDocker,
}));

vi.mock("../services/stack-scanner", () => ({
  scanStacksDirectory: (...args: unknown[]) => mockScan(...(args as [])),
}));

vi.mock("../services/compose-cli", () => ({
  composeUp: (...args: unknown[]) => mockCompose.composeUp(...args),
  composeDown: (...args: unknown[]) => mockCompose.composeDown(...args),
  composeRestart: (...args: unknown[]) => mockCompose.composeRestart(...args),
  composePull: (...args: unknown[]) => mockCompose.composePull(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockDocker.listContainers.mockResolvedValue([]);
});

describe("GET /api/stacks", () => {
  it("returns stacks with matched containers", async () => {
    mockScan.mockReturnValue([makeStack(), makeStack({ name: "media" })]);
    mockDocker.listContainers.mockResolvedValue([
      makeContainerInfo({ Id: "c1", Names: ["/nginx"] }),
    ]);

    const res = await app.request("/api/stacks");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("mystack");
    expect(body[0].containers).toHaveLength(1);
    expect(body[0].status).toBe("running");
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
    mockScan.mockReturnValue([makeStack()]);
    mockDocker.listContainers.mockResolvedValue([
      makeContainerInfo({ Id: "c1", Names: ["/web"], State: "running", Status: "Up 1 hour" }),
      makeContainerInfo({ Id: "c2", Names: ["/db"], State: "exited", Status: "Exited (0)" }),
    ]);

    const res = await app.request("/api/stacks");

    const body = await res.json();
    expect(body[0].status).toBe("partial");
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
    expect(body[0].status).toBe("stopped");
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
    expect(body[0].status).toBe("stopped");
  });
});

describe("POST /api/stacks/:name/up", () => {
  it("runs compose up for the stack", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.composeUp.mockResolvedValue({ success: true, stdout: "Started\n", stderr: "" });

    const res = await app.request("/api/stacks/mystack/up", { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockCompose.composeUp).toHaveBeenCalledWith("/stacks/mystack/docker-compose.yml");
  });

  it("returns 404 for unknown stack", async () => {
    mockScan.mockReturnValue([]);

    const res = await app.request("/api/stacks/unknown/up", { method: "POST" });

    expect(res.status).toBe(404);
  });

  it("returns 500 when compose fails", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.composeUp.mockResolvedValue({ success: false, stdout: "", stderr: "error\n" });

    const res = await app.request("/api/stacks/mystack/up", { method: "POST" });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("error\n");
  });
});

describe("POST /api/stacks/:name/down", () => {
  it("runs compose down for the stack", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.composeDown.mockResolvedValue({ success: true, stdout: "Stopped\n", stderr: "" });

    const res = await app.request("/api/stacks/mystack/down", { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.output).toBe("Stopped\n");
    expect(mockCompose.composeDown).toHaveBeenCalledWith("/stacks/mystack/docker-compose.yml");
  });

  it("returns 404 for unknown stack", async () => {
    mockScan.mockReturnValue([]);

    const res = await app.request("/api/stacks/unknown/down", { method: "POST" });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stack not found");
  });

  it("returns 500 when compose fails", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.composeDown.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "network mystack_default not found\n",
    });

    const res = await app.request("/api/stacks/mystack/down", { method: "POST" });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("network mystack_default not found\n");
  });
});

describe("POST /api/stacks/:name/restart", () => {
  it("runs compose restart for the stack", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.composeRestart.mockResolvedValue({ success: true, stdout: "", stderr: "" });

    const res = await app.request("/api/stacks/mystack/restart", { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockCompose.composeRestart).toHaveBeenCalledWith("/stacks/mystack/docker-compose.yml");
  });

  it("returns 404 for unknown stack", async () => {
    mockScan.mockReturnValue([]);

    const res = await app.request("/api/stacks/unknown/restart", { method: "POST" });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stack not found");
  });

  it("returns 500 when compose fails", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.composeRestart.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "no containers to restart\n",
    });

    const res = await app.request("/api/stacks/mystack/restart", { method: "POST" });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("no containers to restart\n");
  });
});

describe("POST /api/stacks/:name/pull", () => {
  it("runs compose pull for the stack", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.composePull.mockResolvedValue({ success: true, stdout: "Pulled\n", stderr: "" });

    const res = await app.request("/api/stacks/mystack/pull", { method: "POST" });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.output).toBe("Pulled\n");
    expect(mockCompose.composePull).toHaveBeenCalledWith("/stacks/mystack/docker-compose.yml");
  });

  it("returns 404 for unknown stack", async () => {
    mockScan.mockReturnValue([makeStack()]);

    const res = await app.request("/api/stacks/other/pull", { method: "POST" });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Stack not found");
  });

  it("returns 500 when pull fails", async () => {
    mockScan.mockReturnValue([makeStack()]);
    mockCompose.composePull.mockResolvedValue({
      success: false,
      stdout: "",
      stderr: "manifest unknown\n",
    });

    const res = await app.request("/api/stacks/mystack/pull", { method: "POST" });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("manifest unknown\n");
  });

  it("uses correct entrypoint for stack with custom path", async () => {
    mockScan.mockReturnValue([
      makeStack({
        name: "media",
        entrypoint: "/stacks/media/compose.yml",
      }),
    ]);
    mockCompose.composePull.mockResolvedValue({ success: true, stdout: "", stderr: "" });

    const res = await app.request("/api/stacks/media/pull", { method: "POST" });

    expect(res.status).toBe(200);
    expect(mockCompose.composePull).toHaveBeenCalledWith("/stacks/media/compose.yml");
  });
});

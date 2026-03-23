import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../app";
import { makeContainerInfo, makeInspectInfo } from "./factories";

const mockDocker = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getContainer: vi.fn(),
}));

vi.mock("../services/docker-client", () => ({
  docker: mockDocker,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/containers", () => {
  it("returns a list of containers", async () => {
    mockDocker.listContainers.mockResolvedValue([
      makeContainerInfo(),
      makeContainerInfo({
        Id: "xyz789",
        Names: ["/another"],
        Image: "redis:7",
        State: "exited",
        Status: "Exited (0) 5 minutes ago",
      }),
    ]);

    const res = await app.request("/api/containers");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("test-container");
    expect(body[0].status).toBe("running");
    expect(body[1].name).toBe("another");
    expect(body[1].status).toBe("exited");
  });

  it("returns empty array when no containers", async () => {
    mockDocker.listContainers.mockResolvedValue([]);

    const res = await app.request("/api/containers");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("GET /api/containers/:id", () => {
  it("returns a single container", async () => {
    mockDocker.getContainer.mockReturnValue({
      inspect: vi.fn().mockResolvedValue(makeInspectInfo()),
    });

    const res = await app.request("/api/containers/abc123def456");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("abc123def456");
    expect(body.name).toBe("test-container");
    expect(body.image).toBe("nginx:latest");
  });

  it("returns 404 for unknown container", async () => {
    mockDocker.getContainer.mockReturnValue({
      inspect: vi.fn().mockRejectedValue(new Error("no such container")),
    });

    const res = await app.request("/api/containers/unknown");

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Container not found");
  });
});

describe("POST /api/containers/:id/start", () => {
  it("fires start and returns ok", async () => {
    const startFn = vi.fn().mockResolvedValue(undefined);

    mockDocker.getContainer.mockReturnValue({ start: startFn });

    const res = await app.request("/api/containers/abc123/start", { method: "POST" });

    expect(res.status).toBe(200);
    expect(startFn).toHaveBeenCalled();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("POST /api/containers/:id/stop", () => {
  it("fires stop and returns ok", async () => {
    const stopFn = vi.fn().mockResolvedValue(undefined);

    mockDocker.getContainer.mockReturnValue({ stop: stopFn });

    const res = await app.request("/api/containers/abc123/stop", { method: "POST" });

    expect(res.status).toBe(200);
    expect(stopFn).toHaveBeenCalled();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

describe("POST /api/containers/:id/restart", () => {
  it("fires restart and returns ok", async () => {
    const restartFn = vi.fn().mockResolvedValue(undefined);

    mockDocker.getContainer.mockReturnValue({ restart: restartFn });

    const res = await app.request("/api/containers/abc123/restart", { method: "POST" });

    expect(res.status).toBe(200);
    expect(restartFn).toHaveBeenCalled();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

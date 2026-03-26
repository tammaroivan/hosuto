import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkImageUpdate, checkStackUpdates } from "../update-checker";

const mockInspect = vi.fn();
const mockExecFile = vi.fn();

vi.mock("../docker-client", () => ({
  docker: {
    getImage: () => ({ inspect: mockInspect }),
  },
}));

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => {
    const callback = args[args.length - 1] as (
      error: Error | null,
      stdout: string,
      stderr: string,
    ) => void;
    const result = mockExecFile(...args);
    callback(result?.error ?? null, result?.stdout ?? "", result?.stderr ?? "");
    return {};
  },
  spawn: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkImageUpdate", () => {
  it("detects update when digests differ", async () => {
    mockInspect.mockResolvedValue({
      RepoDigests: ["nginx@sha256:aaa111"],
    });
    mockExecFile.mockReturnValue({
      stdout: "Name: nginx:latest\nDigest: sha256:bbb222\nManifests:\n",
    });

    const result = await checkImageUpdate("nginx:latest", "web");

    expect(result.updateAvailable).toBe(true);
    expect(result.currentDigest).toBe("sha256:aaa111");
    expect(result.remoteDigest).toBe("sha256:bbb222");
    expect(result.service).toBe("web");
  });

  it("reports no update when digests match", async () => {
    mockInspect.mockResolvedValue({
      RepoDigests: ["nginx@sha256:aaa111"],
    });
    mockExecFile.mockReturnValue({
      stdout: "Name: nginx:latest\nDigest: sha256:aaa111\nManifests:\n",
    });

    const result = await checkImageUpdate("nginx:latest", "web");

    expect(result.updateAvailable).toBe(false);
  });

  it("returns error when local image not found", async () => {
    mockInspect.mockRejectedValue(new Error("not found"));
    mockExecFile.mockReturnValue({
      stdout: "Digest: sha256:bbb222\n",
    });

    const result = await checkImageUpdate("nginx:latest", "web");

    expect(result.updateAvailable).toBe(false);
    expect(result.error).toBe("Image not found locally");
  });

  it("returns error when remote check fails", async () => {
    mockInspect.mockResolvedValue({
      RepoDigests: ["nginx@sha256:aaa111"],
    });
    mockExecFile.mockReturnValue({
      error: new Error("network error"),
      stdout: "",
      stderr: "network error",
    });

    const result = await checkImageUpdate("nginx:latest", "web");

    expect(result.updateAvailable).toBe(false);
    expect(result.error).toBe("Could not check remote");
  });

  it("handles image with no RepoDigests", async () => {
    mockInspect.mockResolvedValue({ RepoDigests: [] });
    mockExecFile.mockReturnValue({
      stdout: "Digest: sha256:bbb222\n",
    });

    const result = await checkImageUpdate("custom:local", "app");

    expect(result.updateAvailable).toBe(false);
    expect(result.currentDigest).toBeNull();
  });
});

describe("checkStackUpdates", () => {
  it("checks all running containers and aggregates results", async () => {
    mockInspect.mockResolvedValue({
      RepoDigests: ["nginx@sha256:aaa111"],
    });
    mockExecFile.mockReturnValue({
      stdout: "Digest: sha256:bbb222\n",
    });

    const containers = [
      { image: "nginx:latest", serviceName: "web", status: "running" as const },
      { image: "redis:7", serviceName: "cache", status: "running" as const },
    ];

    const result = await checkStackUpdates("mystack", containers);

    expect(result.stackName).toBe("mystack");
    expect(result.results).toHaveLength(2);
    expect(result.hasUpdates).toBe(true);
    expect(result.lastChecked).toBeTruthy();
  });

  it("skips not_created containers", async () => {
    mockInspect.mockResolvedValue({
      RepoDigests: ["nginx@sha256:aaa111"],
    });
    mockExecFile.mockReturnValue({
      stdout: "Digest: sha256:aaa111\n",
    });

    const containers = [
      { image: "nginx:latest", serviceName: "web", status: "running" as const },
      { image: "—", serviceName: "db", status: "not_created" as const },
    ];

    const result = await checkStackUpdates("mystack", containers);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].service).toBe("web");
  });

  it("deduplicates same image across services", async () => {
    mockInspect.mockResolvedValue({
      RepoDigests: ["nginx@sha256:aaa111"],
    });
    mockExecFile.mockReturnValue({
      stdout: "Digest: sha256:aaa111\n",
    });

    const containers = [
      { image: "nginx:latest", serviceName: "web1", status: "running" as const },
      { image: "nginx:latest", serviceName: "web2", status: "running" as const },
    ];

    const result = await checkStackUpdates("mystack", containers);

    expect(result.results).toHaveLength(1);
  });
});

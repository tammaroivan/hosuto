import { describe, it, expect } from "vitest";
import { STATUS_CONFIG, DEFAULT_STATUS } from "../status";
import type { ContainerStatus } from "@hosuto/shared";

describe("STATUS_CONFIG", () => {
  it("has an entry for every ContainerStatus", () => {
    const statuses: ContainerStatus[] = [
      "running",
      "stopped",
      "exited",
      "restarting",
      "unhealthy",
      "dead",
    ];

    for (const status of statuses) {
      expect(STATUS_CONFIG[status]).toBeDefined();
      expect(STATUS_CONFIG[status].dot).toBeTruthy();
      expect(STATUS_CONFIG[status].text).toBeTruthy();
      expect(STATUS_CONFIG[status].label).toBeTruthy();
    }
  });

  it("uses green for running", () => {
    expect(STATUS_CONFIG.running.dot).toContain("green");
    expect(STATUS_CONFIG.running.text).toContain("green");
    expect(STATUS_CONFIG.running.label).toBe("ACTIVE");
  });

  it("uses rose for unhealthy and dead", () => {
    expect(STATUS_CONFIG.unhealthy.dot).toContain("rose");
    expect(STATUS_CONFIG.dead.dot).toContain("rose");
  });

  it("uses muted for stopped and exited", () => {
    expect(STATUS_CONFIG.stopped.dot).toContain("muted");
    expect(STATUS_CONFIG.exited.dot).toContain("muted");
  });
});

describe("DEFAULT_STATUS", () => {
  it("has muted styling and UNKNOWN label", () => {
    expect(DEFAULT_STATUS.dot).toContain("muted");
    expect(DEFAULT_STATUS.label).toBe("UNKNOWN");
  });
});

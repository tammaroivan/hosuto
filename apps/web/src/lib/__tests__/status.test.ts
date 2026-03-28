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
      "not_created",
    ];

    for (const status of statuses) {
      expect(STATUS_CONFIG[status]).toBeDefined();
      expect(STATUS_CONFIG[status].dot).toBeTruthy();
      expect(STATUS_CONFIG[status].text).toBeTruthy();
      expect(STATUS_CONFIG[status].badge).toBeTruthy();
      expect(STATUS_CONFIG[status].label).toBeTruthy();
    }
  });

  it("uses success color for running", () => {
    expect(STATUS_CONFIG.running.dot).toBe("bg-success");
    expect(STATUS_CONFIG.running.text).toBe("text-success");
    expect(STATUS_CONFIG.running.badge).toContain("success");
    expect(STATUS_CONFIG.running.label).toBe("ACTIVE");
  });

  it("uses danger color for unhealthy and dead", () => {
    expect(STATUS_CONFIG.unhealthy.dot).toBe("bg-danger");
    expect(STATUS_CONFIG.dead.dot).toBe("bg-danger");
  });

  it("uses muted for stopped and exited", () => {
    expect(STATUS_CONFIG.stopped.dot).toContain("muted");
    expect(STATUS_CONFIG.exited.dot).toContain("muted");
  });

  it("uses warning for restarting", () => {
    expect(STATUS_CONFIG.restarting.dot).toBe("bg-warning");
    expect(STATUS_CONFIG.restarting.text).toBe("text-warning");
  });

  it("has border in not_created", () => {
    expect(STATUS_CONFIG.not_created.dot).toBe("bg-border");
    expect(STATUS_CONFIG.not_created.label).toBe("NOT CREATED");
  });
});

describe("DEFAULT_STATUS", () => {
  it("has muted styling and UNKNOWN label", () => {
    expect(DEFAULT_STATUS.dot).toContain("muted");
    expect(DEFAULT_STATUS.badge).toBeTruthy();
    expect(DEFAULT_STATUS.label).toBe("UNKNOWN");
  });
});

import { describe, it, expect } from "vitest";
import {
  calculateCpuPercent,
  calculateNetworkIO,
  calculateDiskIO,
  type DockerStatsResponse,
} from "../docker-stats";

const makeStatsResponse = (
  overrides: Partial<DockerStatsResponse> = {},
): DockerStatsResponse => ({
  cpu_stats: {
    cpu_usage: { total_usage: 200_000_000 },
    system_cpu_usage: 2_000_000_000,
    online_cpus: 4,
  },
  precpu_stats: {
    cpu_usage: { total_usage: 100_000_000 },
    system_cpu_usage: 1_000_000_000,
  },
  memory_stats: { usage: 100_000_000, limit: 1_000_000_000 },
  ...overrides,
});

describe("calculateCpuPercent", () => {
  it("calculates CPU percentage from delta values", () => {
    const stats = makeStatsResponse();
    const result = calculateCpuPercent(stats);
    // (100M / 1000M) * 4 cpus * 100 = 40%
    expect(result).toBe(40);
  });

  it("returns 0 when system delta is zero", () => {
    const stats = makeStatsResponse({
      cpu_stats: {
        cpu_usage: { total_usage: 200_000_000 },
        system_cpu_usage: 1_000_000_000,
        online_cpus: 4,
      },
      precpu_stats: {
        cpu_usage: { total_usage: 100_000_000 },
        system_cpu_usage: 1_000_000_000,
      },
    });
    expect(calculateCpuPercent(stats)).toBe(0);
  });

  it("returns 0 when cpu delta is negative", () => {
    const stats = makeStatsResponse({
      cpu_stats: {
        cpu_usage: { total_usage: 50_000_000 },
        system_cpu_usage: 2_000_000_000,
        online_cpus: 4,
      },
      precpu_stats: {
        cpu_usage: { total_usage: 100_000_000 },
        system_cpu_usage: 1_000_000_000,
      },
    });
    expect(calculateCpuPercent(stats)).toBe(0);
  });

  it("defaults to 1 cpu when online_cpus is missing", () => {
    const stats = makeStatsResponse({
      cpu_stats: {
        cpu_usage: { total_usage: 200_000_000 },
        system_cpu_usage: 2_000_000_000,
      },
      precpu_stats: {
        cpu_usage: { total_usage: 100_000_000 },
        system_cpu_usage: 1_000_000_000,
      },
    });
    // (100M / 1000M) * 1 cpu * 100 = 10%
    expect(calculateCpuPercent(stats)).toBe(10);
  });

  it("rounds to 2 decimal places", () => {
    const stats = makeStatsResponse({
      cpu_stats: {
        cpu_usage: { total_usage: 133_333_333 },
        system_cpu_usage: 2_000_000_000,
        online_cpus: 2,
      },
      precpu_stats: {
        cpu_usage: { total_usage: 100_000_000 },
        system_cpu_usage: 1_000_000_000,
      },
    });
    const result = calculateCpuPercent(stats);
    const decimals = result.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });
});

describe("calculateNetworkIO", () => {
  it("sums received and transmitted across interfaces", () => {
    const result = calculateNetworkIO({
      eth0: { rx_bytes: 1000, tx_bytes: 2000 },
      eth1: { rx_bytes: 500, tx_bytes: 300 },
    });
    expect(result).toEqual({ received: 1500, transmitted: 2300 });
  });

  it("returns zeros for undefined networks", () => {
    expect(calculateNetworkIO(undefined)).toEqual({ received: 0, transmitted: 0 });
  });

  it("handles single interface", () => {
    const result = calculateNetworkIO({
      eth0: { rx_bytes: 42, tx_bytes: 99 },
    });
    expect(result).toEqual({ received: 42, transmitted: 99 });
  });

  it("handles empty networks object", () => {
    expect(calculateNetworkIO({})).toEqual({ received: 0, transmitted: 0 });
  });
});

describe("calculateDiskIO", () => {
  it("sums read and write operations", () => {
    const result = calculateDiskIO([
      { op: "Read", value: 1000 },
      { op: "Write", value: 2000 },
      { op: "Read", value: 500 },
    ]);
    expect(result).toEqual({ read: 1500, write: 2000 });
  });

  it("returns zeros for undefined", () => {
    expect(calculateDiskIO(undefined)).toEqual({ read: 0, write: 0 });
  });

  it("handles lowercase op names", () => {
    const result = calculateDiskIO([
      { op: "read", value: 100 },
      { op: "write", value: 200 },
    ]);
    expect(result).toEqual({ read: 100, write: 200 });
  });

  it("ignores unknown op types", () => {
    const result = calculateDiskIO([
      { op: "Read", value: 100 },
      { op: "Sync", value: 50 },
      { op: "Discard", value: 25 },
    ]);
    expect(result).toEqual({ read: 100, write: 0 });
  });

  it("handles empty array", () => {
    expect(calculateDiskIO([])).toEqual({ read: 0, write: 0 });
  });
});

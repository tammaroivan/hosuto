import { describe, it, expect } from "vitest";
import { matchContainersToStacks, mapStatus, mapPorts } from "../docker";
import type { ComposeFile, Container, StackStatus } from "@hosuto/shared";

interface PortInput {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: string;
}

const makeContainer = (overrides: Partial<Container> = {}): Container => {
  return {
    id: "abc123",
    name: "test-container",
    image: "nginx:latest",
    status: "running",
    state: "running",
    stackName: null,
    serviceName: null,
    ports: [],
    mounts: [],
    created: "2026-01-01T00:00:00.000Z",
    uptime: "Up 2 hours",
    ...overrides,
  };
};

const makeStack = (
  name: string,
  services: string[] = [],
  state: "running" | "partial" | "stopped" = "stopped",
) => ({
  name,
  files: [{ services }] as ComposeFile[],
  containers: [] as Container[],
  status: { state, running: 0, expected: services.length } as StackStatus,
  hasBuildDirectives: false,
  updates: null,
});

describe("mapStatus", () => {
  it("returns running for running state", () => {
    expect(mapStatus("running", "Up 2 hours")).toBe("running");
  });

  it("returns exited for exited state", () => {
    expect(mapStatus("exited", "Exited (0) 5 minutes ago")).toBe("exited");
  });

  it("returns restarting for restarting state", () => {
    expect(mapStatus("restarting", "Restarting (1) 5 seconds ago")).toBe("restarting");
  });

  it("returns dead for dead state", () => {
    expect(mapStatus("dead", "Dead")).toBe("dead");
  });

  it("returns stopped for unknown states", () => {
    expect(mapStatus("created", "Created")).toBe("stopped");
    expect(mapStatus("paused", "Paused")).toBe("stopped");
  });

  it("returns unhealthy when status text contains unhealthy", () => {
    expect(mapStatus("running", "Up 2 hours (unhealthy)")).toBe("unhealthy");
  });

  it("unhealthy takes priority over running state", () => {
    expect(mapStatus("running", "Up 5 minutes (unhealthy)")).toBe("unhealthy");
  });
});

describe("mapPorts", () => {
  it("maps ports with public bindings", () => {
    const ports: PortInput[] = [
      { PrivatePort: 80, PublicPort: 8080, Type: "tcp" },
      { PrivatePort: 443, PublicPort: 8443, Type: "tcp" },
    ];

    const result = mapPorts(ports);
    expect(result).toEqual([
      { hostPort: 8080, containerPort: 80, protocol: "tcp" },
      { hostPort: 8443, containerPort: 443, protocol: "tcp" },
    ]);
  });

  it("filters out ports without public binding", () => {
    const ports: PortInput[] = [
      { PrivatePort: 80, Type: "tcp" },
      { PrivatePort: 443, PublicPort: 8443, Type: "tcp" },
    ];

    const result = mapPorts(ports);
    expect(result).toHaveLength(1);
    expect(result[0].hostPort).toBe(8443);
  });

  it("deduplicates IPv4/IPv6 duplicate bindings", () => {
    const ports: PortInput[] = [
      { IP: "0.0.0.0", PrivatePort: 80, PublicPort: 8080, Type: "tcp" },
      { IP: "::", PrivatePort: 80, PublicPort: 8080, Type: "tcp" },
    ];

    const result = mapPorts(ports);
    expect(result).toHaveLength(1);
  });

  it("keeps different protocols as separate entries", () => {
    const ports: PortInput[] = [
      { PrivatePort: 51413, PublicPort: 51413, Type: "tcp" },
      { PrivatePort: 51413, PublicPort: 51413, Type: "udp" },
    ];

    const result = mapPorts(ports);
    expect(result).toHaveLength(2);
    expect(result[0].protocol).toBe("tcp");
    expect(result[1].protocol).toBe("udp");
  });

  it("returns empty array for no ports", () => {
    expect(mapPorts([])).toEqual([]);
  });

  it("handles mixed public and private-only ports", () => {
    const ports: PortInput[] = [
      { PrivatePort: 3306, Type: "tcp" },
      { PrivatePort: 80, PublicPort: 80, Type: "tcp" },
      { PrivatePort: 6379, Type: "tcp" },
    ];

    const result = mapPorts(ports);
    expect(result).toHaveLength(1);
    expect(result[0].containerPort).toBe(80);
  });
});

describe("matchContainersToStacks", () => {
  it("matches containers to stacks by stackName", () => {
    const stacks = [makeStack("media"), makeStack("network")];

    const containers = [
      makeContainer({ name: "plex", stackName: "media", serviceName: "plex", state: "running" }),
      makeContainer({
        name: "sonarr",
        stackName: "media",
        serviceName: "sonarr",
        state: "running",
      }),
      makeContainer({
        name: "traefik",
        stackName: "network",
        serviceName: "traefik",
        state: "running",
      }),
    ];

    matchContainersToStacks(stacks, containers);

    expect(stacks[0].containers).toHaveLength(2);
    expect(stacks[1].containers).toHaveLength(1);
  });

  it("sets status to running when all containers are running", () => {
    const stacks = [makeStack("media", ["plex", "sonarr"])];

    const containers = [
      makeContainer({ name: "plex", stackName: "media", serviceName: "plex", state: "running" }),
      makeContainer({
        name: "sonarr",
        stackName: "media",
        serviceName: "sonarr",
        state: "running",
      }),
    ];

    matchContainersToStacks(stacks, containers);
    expect(stacks[0].status.state).toBe("running");
    expect(stacks[0].status.running).toBe(2);
    expect(stacks[0].status.expected).toBe(2);
  });

  it("sets status to stopped when all containers are stopped", () => {
    const stacks = [makeStack("media", ["plex", "sonarr"], "running")];

    const containers = [
      makeContainer({ name: "plex", stackName: "media", serviceName: "plex", state: "exited" }),
      makeContainer({
        name: "sonarr",
        stackName: "media",
        serviceName: "sonarr",
        state: "exited",
      }),
    ];

    matchContainersToStacks(stacks, containers);
    expect(stacks[0].status.state).toBe("stopped");
    expect(stacks[0].status.running).toBe(0);
  });

  it("sets status to partial when some containers are running", () => {
    const stacks = [makeStack("media", ["plex", "sonarr"])];

    const containers = [
      makeContainer({ name: "plex", stackName: "media", serviceName: "plex", state: "running" }),
      makeContainer({
        name: "sonarr",
        stackName: "media",
        serviceName: "sonarr",
        state: "exited",
      }),
    ];

    matchContainersToStacks(stacks, containers);
    expect(stacks[0].status.state).toBe("partial");
    expect(stacks[0].status.running).toBe(1);
    expect(stacks[0].status.expected).toBe(2);
  });

  it("sets status to stopped when no containers match", () => {
    const stacks = [makeStack("media", [], "running")];

    const containers = [
      makeContainer({
        name: "traefik",
        stackName: "network",
        serviceName: "traefik",
        state: "running",
      }),
    ];

    matchContainersToStacks(stacks, containers);
    expect(stacks[0].status.state).toBe("stopped");
    expect(stacks[0].containers).toHaveLength(0);
  });

  it("ignores containers with no stackName", () => {
    const stacks = [makeStack("media")];

    const containers = [makeContainer({ name: "orphan", stackName: null, state: "running" })];

    matchContainersToStacks(stacks, containers);
    expect(stacks[0].containers).toHaveLength(0);
  });

  it("returns the stacks array", () => {
    const stacks = [makeStack("media")];

    const result = matchContainersToStacks(stacks, []);
    expect(result).toBe(stacks);
  });

  it("synthesizes placeholder containers for services without real containers", () => {
    const stacks = [makeStack("media", ["plex", "sonarr", "radarr"])];

    const containers = [
      makeContainer({ name: "plex", stackName: "media", serviceName: "plex", state: "running" }),
    ];

    matchContainersToStacks(stacks, containers);

    expect(stacks[0].containers).toHaveLength(3);
    const placeholders = stacks[0].containers.filter(c => c.status === "not_created");
    expect(placeholders).toHaveLength(2);
    expect(placeholders.map(p => p.name).sort()).toEqual(["radarr", "sonarr"]);
    expect(stacks[0].status).toEqual({ state: "partial", running: 1, expected: 3 });
  });

  it("does not synthesize placeholders when all services have containers", () => {
    const stacks = [makeStack("media", ["plex", "sonarr"])];

    const containers = [
      makeContainer({ name: "plex", stackName: "media", serviceName: "plex", state: "running" }),
      makeContainer({
        name: "sonarr",
        stackName: "media",
        serviceName: "sonarr",
        state: "running",
      }),
    ];

    matchContainersToStacks(stacks, containers);

    expect(stacks[0].containers).toHaveLength(2);
    expect(stacks[0].containers.every(c => c.status !== "not_created")).toBe(true);
  });

  it("reports running and expected counts in status", () => {
    const stacks = [makeStack("media", ["plex", "sonarr", "radarr"])];

    const containers = [
      makeContainer({ name: "plex", stackName: "media", serviceName: "plex", state: "running" }),
      makeContainer({
        name: "sonarr",
        stackName: "media",
        serviceName: "sonarr",
        state: "exited",
      }),
    ];

    matchContainersToStacks(stacks, containers);

    expect(stacks[0].status).toEqual({ state: "partial", running: 1, expected: 3 });
  });
});

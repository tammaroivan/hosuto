import type { Stack } from "@hosuto/shared";

export const makeContainerInfo = (overrides: Record<string, unknown> = {}) => {
  return {
    Id: "abc123def456",
    Names: ["/test-container"],
    Image: "nginx:latest",
    State: "running",
    Status: "Up 2 hours",
    Labels: {
      "com.docker.compose.project": "mystack",
      "com.docker.compose.service": "test-container",
    },
    Ports: [],
    Created: 1700000000,
    ...overrides,
  };
};

export const makeInspectInfo = (overrides: Record<string, unknown> = {}) => {
  return {
    Id: "abc123def456",
    Name: "/test-container",
    Config: {
      Image: "nginx:latest",
      Labels: {
        "com.docker.compose.project": "mystack",
        "com.docker.compose.service": "test-container",
      },
    },
    State: {
      Status: "running",
      Running: true,
      StartedAt: "2026-01-01T00:00:00.000Z",
    },
    NetworkSettings: { Ports: {} },
    ...overrides,
  };
};

export const makeStack = (overrides: Partial<Stack> = {}): Stack => {
  return {
    name: "mystack",
    entrypoint: "/stacks/mystack/docker-compose.yml",
    files: [],
    containers: [],
    status: { state: "stopped", running: 0, expected: 0 },
    hasBuildDirectives: false,
    ...overrides,
  };
};

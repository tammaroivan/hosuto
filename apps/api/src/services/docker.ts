import type { Container, ContainerStatus, PortMapping } from "@hosuto/shared";
import { docker } from "./docker-client";

/**
 * Lists all Docker containers.
 *
 * @returns {Promise<Container[]>} A promise that resolves to an array of containers with their metadata.
 */
export async function listContainers(): Promise<Container[]> {
  const containers = await docker.listContainers({ all: true });

  return containers.map((info) => {
    const name = info.Names[0]?.replace(/^\//, "") || info.Id.slice(0, 12);

    return {
      id: info.Id,
      name,
      image: info.Image,
      status: mapStatus(info.State, info.Status),
      state: info.State,
      stackName: info.Labels["com.docker.compose.project"] || null,
      ports: mapPorts(info.Ports),
      created: new Date(info.Created * 1000).toISOString(),
      uptime: info.State === "running" ? info.Status : null,
    };
  });
}

/**
 * Retrieves information about a Docker container.
 *
 * @param containerId - The ID of the container to retrieve
 * @returns A promise that resolves to the container information
 */
export async function getContainer(containerId: string): Promise<Container> {
  const container = docker.getContainer(containerId);
  const info = await container.inspect();

  const ports: PortMapping[] = [];
  const seenPorts = new Set<string>();
  if (info.NetworkSettings.Ports) {
    for (const [containerPort, bindings] of Object.entries(info.NetworkSettings.Ports)) {
      if (!bindings) {
        continue;
      }

      const [port, protocol] = containerPort.split("/");

      for (const binding of bindings) {
        const key = `${binding.HostPort}-${port}-${protocol}`;
        if (seenPorts.has(key)) {
          continue;
        }

        seenPorts.add(key);
        ports.push({
          hostPort: parseInt(binding.HostPort, 10),
          containerPort: parseInt(port, 10),
          protocol: (protocol as "tcp" | "udp") || "tcp",
        });
      }
    }
  }

  return {
    id: info.Id,
    name: info.Name.replace(/^\//, ""),
    image: info.Config.Image,
    status: mapStatus(info.State.Status, info.State.Status),
    state: info.State.Status,
    stackName: info.Config.Labels["com.docker.compose.project"] || null,
    ports,
    created: info.Created,
    uptime: info.State.Running ? `Up since ${info.State.StartedAt}` : null,
  };
}

/**
 * Matches containers to their respective stacks and updates the stack status.
 *
 * @template T - The stack object type with name, containers, and status properties.
 * @param stacks - Array of stacks to be updated with matched containers.
 * @param containers - Array of all available containers to match against stacks.
 * @returns The stacks array with containers assigned and status updated based on running container count.
 */
export function matchContainersToStacks<
  T extends { name: string; containers: Container[]; status: "running" | "partial" | "stopped" },
>(stacks: T[], containers: Container[]): T[] {
  for (const stack of stacks) {
    stack.containers = containers.filter((ct) => ct.stackName === stack.name);

    const running = stack.containers.filter((ct) => ct.state === "running").length;
    const total = stack.containers.length;

    if (total === 0) {
      stack.status = "stopped";
    } else if (running === total) {
      stack.status = "running";
    } else if (running === 0) {
      stack.status = "stopped";
    } else {
      stack.status = "partial";
    }
  }

  return stacks;
}

export function mapStatus(state: string, statusText: string): ContainerStatus {
  if (statusText.toLowerCase().includes("unhealthy")) {
    return "unhealthy";
  }

  switch (state) {
    case "running":
      return "running";
    case "restarting":
      return "restarting";
    case "exited":
      return "exited";
    case "dead":
      return "dead";
    default:
      return "stopped";
  }
}

export function mapPorts(
  ports: { PrivatePort: number; PublicPort?: number; Type: string }[],
): PortMapping[] {
  const seen = new Set<string>();

  return ports
    .filter((port) => {
      if (!port.PublicPort) {
        return false;
      }

      const key = `${port.PublicPort}-${port.PrivatePort}-${port.Type}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((port) => ({
      hostPort: port.PublicPort!,
      containerPort: port.PrivatePort,
      protocol: (port.Type as "tcp" | "udp") || "tcp",
    }));
}

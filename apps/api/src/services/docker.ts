import type { ComposeFile, Container, ContainerStatus, PortMapping } from "@hosuto/shared";
import { docker } from "./docker-client";

/**
 * Lists all Docker containers.
 */
export const listContainers = async (): Promise<Container[]> => {
  const containers = await docker.listContainers({ all: true });

  return containers.map(info => {
    const name = info.Names[0]?.replace(/^\//, "") || info.Id.slice(0, 12);

    return {
      id: info.Id,
      name,
      image: info.Image,
      status: mapStatus(info.State, info.Status),
      state: info.State,
      stackName: info.Labels["com.docker.compose.project"] || null,
      serviceName: info.Labels["com.docker.compose.service"] || null,
      ports: mapPorts(info.Ports),
      created: new Date(info.Created * 1000).toISOString(),
      uptime: info.State === "running" ? info.Status.replace(/\s*\(.*\)$/, "") : null,
    };
  });
};

/**
 * Retrieves information about a Docker container.
 *
 * @param containerId - The ID of the container to retrieve
 * @returns A promise that resolves to the container information
 */
export const getContainer = async (containerId: string): Promise<Container> => {
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
    serviceName: info.Config.Labels["com.docker.compose.service"] || null,
    ports,
    created: info.Created,
    uptime: info.State.Running ? `Up since ${info.State.StartedAt}` : null,
  };
};

/**
 * Matches containers to their respective stacks and updates the stack status.
 */
export const matchContainersToStacks = <
  T extends {
    name: string;
    files: ComposeFile[];
    containers: Container[];
    status: "running" | "partial" | "stopped";
  },
>(
  stacks: T[],
  containers: Container[],
): T[] => {
  for (const stack of stacks) {
    const realContainers = containers.filter(container => container.stackName === stack.name);

    const matchedServices = new Set(
      realContainers
        .map(container => container.serviceName)
        .filter((service): service is string => service !== null && service !== undefined),
    );

    const expectedServices = new Set(stack.files.flatMap(file => file.services));

    const placeholders: Container[] = [];
    for (const service of expectedServices) {
      if (!matchedServices.has(service)) {
        placeholders.push({
          id: `placeholder-${stack.name}-${service}`,
          name: service,
          image: "—",
          status: "not_created",
          state: "not_created",
          stackName: stack.name,
          serviceName: service,
          ports: [],
          created: "",
          uptime: null,
        });
      }
    }

    stack.containers = [...realContainers, ...placeholders];

    const running = realContainers.filter(container => container.state === "running").length;
    const total = realContainers.length;

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
};

export const mapStatus = (state: string, statusText: string): ContainerStatus => {
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
};

export const mapPorts = (
  ports: { PrivatePort: number; PublicPort?: number; Type: string }[],
): PortMapping[] => {
  const seen = new Set<string>();

  return ports
    .filter(port => {
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
    .map(port => ({
      hostPort: port.PublicPort!,
      containerPort: port.PrivatePort,
      protocol: (port.Type as "tcp" | "udp") || "tcp",
    }));
};

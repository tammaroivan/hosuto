import type {
  ComposeFile,
  Container,
  ContainerMount,
  ContainerStatus,
  PortMapping,
  StackStatus,
} from "@hosuto/shared";
import { computeStackStatus } from "@hosuto/shared";
import { docker } from "./docker-client";

const selfId = process.env.HOSTNAME || "";

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
      mounts: [],
      created: new Date(info.Created * 1000).toISOString(),
      uptime: info.State === "running" ? info.Status.replace(/\s*\(.*\)$/, "") : null,
      isSelf: selfId !== "" && info.Id.startsWith(selfId),
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

  const MOUNT_TYPES = new Set(["volume", "bind", "tmpfs"]);
  const mounts: ContainerMount[] = (info.Mounts || []).map(mount => ({
    type: MOUNT_TYPES.has(mount.Type) ? (mount.Type as ContainerMount["type"]) : "volume",
    source: mount.Source || "",
    destination: mount.Destination,
    rw: mount.RW,
  }));

  return {
    id: info.Id,
    name: info.Name.replace(/^\//, ""),
    image: info.Config.Image,
    status: mapStatus(info.State.Status, info.State.Status),
    state: info.State.Status,
    stackName: info.Config.Labels["com.docker.compose.project"] || null,
    serviceName: info.Config.Labels["com.docker.compose.service"] || null,
    ports,
    mounts,
    created: info.Created,
    uptime: info.State.Running ? `Up since ${info.State.StartedAt}` : null,
    isSelf: selfId !== "" && info.Id.startsWith(selfId),
  };
};

/**
 * Force-removes containers by name or id. Missing containers (404) are treated as already
 * gone so a retry stays idempotent; any other failure rejects. Used to clear a container
 * whose fixed `container_name` blocks Compose from recreating its own (see the
 * resolve-conflict route).
 */
export const removeContainers = async (names: string[]): Promise<void> => {
  await Promise.all(
    names.map(async name => {
      try {
        await docker.getContainer(name).remove({ force: true });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode === 404) {
          return;
        }

        throw error;
      }
    }),
  );
};

type MatchableStack = {
  name: string;
  entrypoint: string;
  files: ComposeFile[];
  containers: Container[];
  status: StackStatus;
  serviceScope: string[] | null;
};

/**
 * Assigns containers to stacks and updates each stack's status. Independent stacks
 * (`serviceScope === null`) match by project name; scoped slices are grouped by root
 * entrypoint, the project is inferred from running containers, then each container is
 * assigned to the slice owning its service.
 */
export const matchContainersToStacks = <T extends MatchableStack>(
  stacks: T[],
  containers: Container[],
): T[] => {
  for (const stack of stacks.filter(stack => stack.serviceScope === null)) {
    const expectedServices = new Set(stack.files.flatMap(file => file.services));
    const realContainers = containers.filter(container => container.stackName === stack.name);
    assignContainers(stack, realContainers, expectedServices);
  }

  const groups = new Map<string, T[]>();
  for (const stack of stacks.filter(stack => stack.serviceScope !== null)) {
    const group = groups.get(stack.entrypoint);
    if (group) {
      group.push(stack);
    } else {
      groups.set(stack.entrypoint, [stack]);
    }
  }

  for (const group of groups.values()) {
    const groupServices = new Set(group.flatMap(stack => stack.serviceScope ?? []));
    const project = inferProject(containers, groupServices);

    for (const stack of group) {
      const expectedServices = new Set(stack.serviceScope ?? []);
      const realContainers = containers.filter(
        container =>
          container.stackName === project &&
          container.serviceName !== null &&
          expectedServices.has(container.serviceName),
      );
      assignContainers(stack, realContainers, expectedServices);
    }
  }

  return stacks;
};

/**
 * Sets a stack's containers (real ones plus `not_created` placeholders for expected
 * services that have no container) and recomputes its status.
 */
const assignContainers = (
  stack: { name: string; containers: Container[]; status: StackStatus },
  realContainers: Container[],
  expectedServices: Set<string>,
): void => {
  const matchedServices = new Set(
    realContainers
      .map(container => container.serviceName)
      .filter((service): service is string => service !== null && service !== undefined),
  );

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
        mounts: [],
        created: "",
        uptime: null,
        isSelf: false,
      });
    }
  }

  stack.containers = [...realContainers, ...placeholders];

  const running = realContainers.filter(container => container.state === "running").length;
  stack.status = computeStackStatus(running, expectedServices.size);
};

/**
 * Infers an include group's compose project by majority vote among containers whose
 * service belongs to the group — the project label need not match any stack's name.
 */
const inferProject = (containers: Container[], groupServices: Set<string>): string | null => {
  const counts = new Map<string, number>();
  for (const container of containers) {
    if (
      container.stackName !== null &&
      container.serviceName !== null &&
      groupServices.has(container.serviceName)
    ) {
      counts.set(container.stackName, (counts.get(container.stackName) ?? 0) + 1);
    }
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [project, count] of counts) {
    if (count > bestCount) {
      best = project;
      bestCount = count;
    }
  }

  return best;
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

import type { ContainerStats, AggregatedStats } from "@hosuto/shared";
import { docker } from "./docker-client";

const STATS_INTERVAL = 10_000;

interface DockerCpuStats {
  cpu_usage: { total_usage: number };
  system_cpu_usage: number;
  online_cpus?: number;
}

export interface DockerStatsResponse {
  cpu_stats: DockerCpuStats;
  precpu_stats: DockerCpuStats;
  memory_stats: { usage?: number; limit?: number };
  networks?: Record<string, { rx_bytes: number; tx_bytes: number }>;
  blkio_stats?: {
    io_service_bytes_recursive?: Array<{ op: string; value: number }>;
  };
  pids_stats?: { current?: number };
}

let statsCache: Record<string, ContainerStats> = {};
let timeoutId: ReturnType<typeof setTimeout> | null = null;
let broadcastFn: ((message: string) => void) | null = null;

export const calculateCpuPercent = (stats: DockerStatsResponse): number => {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;

  if (systemDelta <= 0 || cpuDelta < 0) {
    return 0;
  }

  const cpuCount = stats.cpu_stats.online_cpus ?? 1;
  return Math.round((cpuDelta / systemDelta) * cpuCount * 100 * 100) / 100;
};

export const calculateNetworkIO = (
  networks: DockerStatsResponse["networks"],
): { received: number; transmitted: number } => {
  if (!networks) {
    return { received: 0, transmitted: 0 };
  }

  let received = 0;
  let transmitted = 0;

  for (const networkInterface of Object.values(networks)) {
    received += networkInterface.rx_bytes;
    transmitted += networkInterface.tx_bytes;
  }

  return { received, transmitted };
};

export const calculateDiskIO = (
  diskStats: Array<{ op: string; value: number }> | undefined,
): { read: number; write: number } => {
  if (!diskStats) {
    return { read: 0, write: 0 };
  }

  let read = 0;
  let write = 0;

  for (const entry of diskStats) {
    if (entry.op === "read" || entry.op === "Read") {
      read += entry.value;
    }

    if (entry.op === "write" || entry.op === "Write") {
      write += entry.value;
    }
  }

  return { read, write };
};

const fetchAllStats = async (): Promise<void> => {
  try {
    const containers = await docker.listContainers({ all: false });
    const newCache: Record<string, ContainerStats> = {};

    const results = await Promise.allSettled(
      containers.map(async containerInfo => {
        const container = docker.getContainer(containerInfo.Id);
        const stats = (await container.stats({ stream: false })) as DockerStatsResponse;
        const name = (containerInfo.Names?.[0] || "").replace(/^\//, "");
        const network = calculateNetworkIO(stats.networks);
        const diskIO = calculateDiskIO(stats.blkio_stats?.io_service_bytes_recursive);
        const memoryUsage = stats.memory_stats?.usage ?? 0;
        const memoryLimit = stats.memory_stats?.limit ?? 0;

        const containerStats: ContainerStats = {
          containerId: containerInfo.Id,
          name,
          cpuPercent: calculateCpuPercent(stats),
          memoryUsage,
          memoryLimit,
          memoryPercent:
            memoryLimit > 0 ? Math.round((memoryUsage / memoryLimit) * 10000) / 100 : 0,
          networkRx: network.received,
          networkTx: network.transmitted,
          blockRead: diskIO.read,
          blockWrite: diskIO.write,
          pids: stats.pids_stats?.current ?? 0,
        };

        newCache[containerInfo.Id] = containerStats;
      }),
    );

    const errors = results.filter(result => result.status === "rejected").length;
    if (errors > 0) {
      console.warn(`Stats: ${errors}/${containers.length} containers failed`);
    }

    statsCache = newCache;

    if (broadcastFn && Object.keys(newCache).length > 0) {
      const aggregated = buildAggregatedStats();
      broadcastFn(JSON.stringify({ type: "stats", payload: aggregated }));
    }
  } catch (error) {
    console.error("Failed to fetch container stats:", error);
  }
};

const buildAggregatedStats = (): AggregatedStats => {
  let totalCpuPercent = 0;
  let totalMemoryUsage = 0;
  let totalMemoryLimit = 0;

  for (const containerStats of Object.values(statsCache)) {
    totalCpuPercent += containerStats.cpuPercent;
    totalMemoryUsage += containerStats.memoryUsage;
    totalMemoryLimit += containerStats.memoryLimit;
  }

  return {
    containers: statsCache,
    totals: {
      cpuPercent: Math.round(totalCpuPercent * 100) / 100,
      memoryUsage: totalMemoryUsage,
      memoryLimit: totalMemoryLimit,
      memoryPercent:
        totalMemoryLimit > 0 ? Math.round((totalMemoryUsage / totalMemoryLimit) * 10000) / 100 : 0,
    },
    timestamp: new Date().toISOString(),
  };
};

const scheduleNext = async () => {
  await fetchAllStats();
  if (broadcastFn) {
    timeoutId = setTimeout(scheduleNext, STATS_INTERVAL);
  }
};

export const startStatsCollector = (broadcast: (message: string) => void): void => {
  broadcastFn = broadcast;
  scheduleNext();
  console.log(`Stats collector started (${STATS_INTERVAL / 1000}s interval)`);
};

export const stopStatsCollector = (): void => {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  broadcastFn = null;
  statsCache = {};
};

export const getCachedStats = (): AggregatedStats => buildAggregatedStats();

export const getContainerStats = (containerId: string): ContainerStats | null =>
  statsCache[containerId] ?? null;

import { scanStacksDirectory } from "./stack-scanner";
import { listContainers, matchContainersToStacks } from "./docker";
import { checkStackUpdates } from "./update-checker";
import { broadcastStackUpdates } from "./docker-events";
import { DEFAULT_STACKS_DIR, DEFAULT_UPDATE_CHECK_INTERVAL } from "@hosuto/shared";
import type { StackUpdateStatus } from "@hosuto/shared";

const cache = new Map<string, StackUpdateStatus>();
let intervalId: ReturnType<typeof setInterval> | null = null;

export const getCachedUpdates = (stackName: string): StackUpdateStatus | null => {
  return cache.get(stackName) ?? null;
};

export const setCachedUpdates = (stackName: string, status: StackUpdateStatus): void => {
  cache.set(stackName, status);
};

const runUpdateCheck = async (): Promise<void> => {
  const stacksDir = Bun.env.STACKS_DIR || DEFAULT_STACKS_DIR;

  try {
    const stacks = scanStacksDirectory(stacksDir);
    const containers = await listContainers();
    const matched = matchContainersToStacks(stacks, containers);

    for (const stack of matched) {
      const runningContainers = stack.containers.filter(
        container => container.status !== "not_created",
      );
      if (runningContainers.length === 0) {
        continue;
      }

      try {
        const status = await checkStackUpdates(stack.name, runningContainers);
        cache.set(stack.name, status);

        if (status.hasUpdates) {
          broadcastStackUpdates(stack.name, status);
        }
      } catch (err) {
        console.error(`Update check failed for "${stack.name}":`, err);
      }
    }
  } catch (err) {
    console.error("Update check cycle failed:", err);
  }
};

export const startUpdateScheduler = (intervalSeconds?: number): void => {
  const interval = (intervalSeconds ?? DEFAULT_UPDATE_CHECK_INTERVAL) * 1000;

  if (intervalId) {
    clearInterval(intervalId);
  }

  console.log(`Update checker: running every ${interval / 1000}s`);
  intervalId = setInterval(runUpdateCheck, interval);

  // Run first check after a short delay to let the server start
  setTimeout(runUpdateCheck, 30000);
};

export const stopUpdateScheduler = (): void => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

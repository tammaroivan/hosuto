import type { ContainerStatus } from "@hosuto/shared";

export const STATUS_CONFIG: Record<
  ContainerStatus,
  { dot: string; text: string; label: string }
> = {
  running: { dot: "bg-accent-green", text: "text-accent-green", label: "ACTIVE" },
  stopped: { dot: "bg-text-muted", text: "text-text-muted", label: "STOPPED" },
  exited: { dot: "bg-text-muted", text: "text-text-muted", label: "EXITED" },
  restarting: { dot: "bg-yellow-500", text: "text-yellow-500", label: "RESTARTING" },
  unhealthy: { dot: "bg-accent-rose", text: "text-accent-rose", label: "UNHEALTHY" },
  dead: { dot: "bg-accent-rose", text: "text-accent-rose", label: "DEAD" },
};

export const DEFAULT_STATUS = { dot: "bg-text-muted", text: "text-text-muted", label: "UNKNOWN" };

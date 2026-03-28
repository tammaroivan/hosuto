import type { ContainerStatus } from "@hosuto/shared";

interface StatusStyle {
  dot: string;
  text: string;
  badge: string;
  label: string;
}

export const STATUS_CONFIG: Record<ContainerStatus, StatusStyle> = {
  running: {
    dot: "bg-success",
    text: "text-success",
    badge: "bg-success/10 border-success/20 text-success",
    label: "ACTIVE",
  },
  stopped: {
    dot: "bg-text-muted",
    text: "text-text-muted",
    badge: "bg-surface border-border text-text-secondary",
    label: "STOPPED",
  },
  exited: {
    dot: "bg-text-muted",
    text: "text-text-muted",
    badge: "bg-surface border-border text-text-secondary",
    label: "EXITED",
  },
  restarting: {
    dot: "bg-warning",
    text: "text-warning",
    badge: "bg-warning/10 border-warning/20 text-warning",
    label: "RESTARTING",
  },
  unhealthy: {
    dot: "bg-danger",
    text: "text-danger",
    badge: "bg-danger/10 border-danger/20 text-danger",
    label: "UNHEALTHY",
  },
  dead: {
    dot: "bg-danger",
    text: "text-danger",
    badge: "bg-danger/10 border-danger/20 text-danger",
    label: "DEAD",
  },
  not_created: {
    dot: "bg-border",
    text: "text-text-muted",
    badge: "bg-surface border-border text-text-muted",
    label: "NOT CREATED",
  },
};

export const DEFAULT_STATUS: StatusStyle = {
  dot: "bg-text-muted",
  text: "text-text-muted",
  badge: "bg-surface border-border text-text-secondary",
  label: "UNKNOWN",
};

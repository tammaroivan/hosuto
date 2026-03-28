export interface ContainerMount {
  type: "volume" | "bind" | "tmpfs";
  source: string;
  destination: string;
  rw: boolean;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  status: ContainerStatus;
  state: string;
  stackName: string | null;
  serviceName: string | null;
  ports: PortMapping[];
  mounts: ContainerMount[];
  created: string;
  uptime: string | null;
  isSelf: boolean;
}

export type ContainerStatus =
  | "running"
  | "stopped"
  | "restarting"
  | "unhealthy"
  | "exited"
  | "dead"
  | "not_created";

export interface PortMapping {
  hostPort: number;
  containerPort: number;
  protocol: "tcp" | "udp";
}

export type StackState = "running" | "partial" | "stopped";

export interface StackStatus {
  state: StackState;
  running: number;
  expected: number;
}

export interface Stack {
  name: string;
  entrypoint: string;
  files: ComposeFile[];
  containers: Container[];
  status: StackStatus;
  hasBuildDirectives: boolean;
  updates: StackUpdateStatus | null;
}

export interface ComposeFile {
  path: string;
  relativePath: string;
  content: string;
  services: string[];
  envFiles: string[];
  includedBy: string | null;
}

export interface UpdateCheckResult {
  image: string;
  service: string;
  currentDigest: string | null;
  remoteDigest: string | null;
  updateAvailable: boolean;
  error?: string;
}

export interface StackUpdateStatus {
  stackName: string;
  results: UpdateCheckResult[];
  lastChecked: string;
  hasUpdates: boolean;
}

export interface NotificationPref {
  id: number;
  event: NotificationEvent;
  channel: NotificationChannel;
  config: Record<string, unknown>;
  enabled: boolean;
}

export type NotificationEvent =
  | "container_down"
  | "container_unhealthy"
  | "container_restart_loop"
  | "update_available";

export type NotificationChannel = "expo_push" | "ntfy" | "webhook";

// File API types

export type FileType = "compose" | "env" | "other";

export interface FileNode {
  path: string;
  relativePath: string;
  name: string;
  type: FileType;
  content?: string;
  includedBy: string | null;
}

export interface StackFileTree {
  stackName: string;
  stackDir: string;
  entrypoint: string;
  files: FileNode[];
}

export interface FileContent {
  path: string;
  relativePath: string;
  content: string;
  type: FileType;
  size: number;
  lastModified: string;
}

export interface FileValidationResult {
  valid: boolean;
  output: string;
  errors: string;
}

export interface RenameResult {
  oldPath: string;
  newPath: string;
}

// Container stats types

export interface ContainerStats {
  containerId: string;
  name: string;
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
  pids: number;
}

export interface AggregatedStats {
  containers: Record<string, ContainerStats>;
  totals: {
    cpuPercent: number;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
  };
  timestamp: string;
}

// WebSocket message types

export interface LogLine {
  stream: "stdout" | "stderr";
  text: string;
  timestamp: string;
}

export interface WSContainerStatusMessage {
  type: "container:status";
  payload: { id: string; name: string; action: string; stackName: string | null };
}

export interface WSStackOutputMessage {
  type: "stack:output";
  payload: { stackName: string; line: string; key?: string };
}

export interface WSStackActionMessage {
  type: "stack:action";
  payload: { stackName: string; action: string; success: boolean; error?: string };
}

export interface WSStackUpdatesMessage {
  type: "stack:updates";
  payload: { stackName: string; hasUpdates: boolean };
}

export interface WSStatsMessage {
  type: "stats";
  payload: AggregatedStats;
}

export interface WSLogMessage {
  type: "log";
  payload: { containerId: string; lines: LogLine[] };
}

export interface WSPingMessage {
  type: "ping";
}

export type WSMessage =
  | WSContainerStatusMessage
  | WSStackOutputMessage
  | WSStackActionMessage
  | WSStackUpdatesMessage
  | WSStatsMessage
  | WSLogMessage
  | WSPingMessage;

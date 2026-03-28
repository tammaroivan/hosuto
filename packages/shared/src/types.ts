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

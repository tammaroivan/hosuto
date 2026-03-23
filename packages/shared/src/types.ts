export interface Container {
  id: string;
  name: string;
  image: string;
  status: ContainerStatus;
  state: string;
  stackName: string | null;
  ports: PortMapping[];
  created: string;
  uptime: string | null;
}

export type ContainerStatus =
  | "running"
  | "stopped"
  | "restarting"
  | "unhealthy"
  | "exited"
  | "dead";

export interface PortMapping {
  hostPort: number;
  containerPort: number;
  protocol: "tcp" | "udp";
}

export interface Stack {
  name: string;
  entrypoint: string;
  files: ComposeFile[];
  containers: Container[];
  status: "running" | "partial" | "stopped";
}

export interface ComposeFile {
  path: string;
  relativePath: string;
  content: string;
  services: string[];
  envFiles: string[];
  includedBy: string | null;
}

export interface UpdateInfo {
  containerId: string;
  containerName: string;
  image: string;
  currentDigest: string;
  remoteDigest: string;
  lastChecked: string;
  updateAvailable: boolean;
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

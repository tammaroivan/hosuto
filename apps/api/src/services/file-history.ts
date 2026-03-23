import {
  existsSync,
  statSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  cpSync,
  unlinkSync,
} from "node:fs";
import { basename, join } from "node:path";
import type { FileVersion } from "@hosuto/shared";

export const HISTORY_DIR = ".hosuto-history";
const MAX_VERSIONS = 20;

export const backupFile = (filePath: string, stackDir: string): void => {
  const historyDir = join(stackDir, HISTORY_DIR);
  mkdirSync(historyDir, { recursive: true });

  const name = basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  cpSync(filePath, join(historyDir, `${name}.${timestamp}.bak`));

  // Prune old backups
  const prefix = `${name}.`;
  const backups = readdirSync(historyDir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".bak"))
    .sort();
  const excess = backups.length - MAX_VERSIONS;
  for (let i = 0; i < excess; i++) {
    unlinkSync(join(historyDir, backups[i]));
  }
};

export const listVersions = (stackDir: string, relativePath: string): FileVersion[] => {
  const fileName = basename(relativePath);
  const historyDir = join(stackDir, HISTORY_DIR);

  if (!existsSync(historyDir)) {
    return [];
  }

  const prefix = `${fileName}.`;
  const entries = readdirSync(historyDir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".bak"))
    .sort()
    .reverse();

  return entries.map((entry) => {
    const stat = statSync(join(historyDir, entry));
    return {
      timestamp: stat.mtime.toISOString(),
      filename: entry,
      size: stat.size,
    };
  });
};

export const readVersion = (stackDir: string, historyFilename: string): string | null => {
  const historyDir = join(stackDir, HISTORY_DIR);
  const filePath = join(historyDir, historyFilename);

  if (!filePath.startsWith(historyDir) || historyFilename.includes("/")) {
    return null;
  }

  if (!existsSync(filePath)) {
    return null;
  }

  return readFileSync(filePath, "utf-8");
};

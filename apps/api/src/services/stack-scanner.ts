import { readdirSync, existsSync } from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { parseComposeFile, resolveIncludes } from "./compose-parser";
import type { Stack } from "@hosuto/shared";

const COMPOSE_FILENAMES = [
  "docker-compose.yml",
  "docker-compose.yaml",
  "compose.yml",
  "compose.yaml",
];

/**
 * Searches for a Docker Compose file in the specified directory.
 *
 * @param dir - The directory path to search for compose files
 * @returns The full path to the first compose file found, or null if none exist
 */
const findComposeFile = (dir: string): string | null => {
  for (const name of COMPOSE_FILENAMES) {
    const filePath = join(dir, name);

    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
};

/**
 * Scans a directory for Docker Compose stack files and builds a list of stacks.
 *
 * Discovers compose files in the root directory and one level of subdirectories.
 * Identifies stack entrypoints by excluding files that are included by others.
 *
 * @param stacksDir - The path to the directory containing stack files
 * @returns An array of discovered stacks, sorted alphabetically by name
 */
export const scanStacksDirectory = (stacksDir: string): Stack[] => {
  const absoluteDir = resolve(stacksDir);

  if (!existsSync(absoluteDir)) {
    console.warn(`Stacks directory not found: ${absoluteDir}`);
    return [];
  }

  // Collect all candidate compose files
  const candidates: { path: string; dir: string }[] = [];

  const rootCompose = findComposeFile(absoluteDir);
  if (rootCompose) {
    candidates.push({ path: rootCompose, dir: absoluteDir });
  }

  const entries = readdirSync(absoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const subdir = join(absoluteDir, entry.name);
    const composeFile = findComposeFile(subdir);
    if (composeFile) {
      candidates.push({ path: composeFile, dir: subdir });
    }
  }

  const includedFiles = new Set<string>();
  for (const candidate of candidates) {
    const parsed = parseComposeFile(candidate.path);
    const fileDir = dirname(candidate.path);
    for (const include of parsed.includes) {
      const includePath = resolve(fileDir, include.path);
      includedFiles.add(resolve(includePath));
    }
  }

  const stacks: Stack[] = [];
  for (const candidate of candidates) {
    const absolutePath = resolve(candidate.path);

    // Skip files that are included by another compose file
    if (includedFiles.has(absolutePath)) {
      continue;
    }

    const files = resolveIncludes(candidate.path, absoluteDir);
    const parsed = parseComposeFile(candidate.path);

    const name = parsed.name || deriveStackName(candidate.dir, absoluteDir);

    stacks.push({
      name,
      entrypoint: absolutePath,
      files,
      containers: [], // TODO: Implement containers list
      status: "stopped", // TODO: Implement status
    });
  }

  return stacks.sort((left, right) => left.name.localeCompare(right.name));
};

/**
 * Derives the stack name from the given compose directory and stacks directory.
 * If the directories are the same, returns the basename of the stacks directory.
 * Otherwise, returns the basename of the compose directory.
 *
 * @param composeDir - The path to the compose directory
 * @param stacksDir - The path to the stacks directory
 * @returns The derived stack name
 */
const deriveStackName = (composeDir: string, stacksDir: string): string => {
  const resolved = resolve(composeDir);
  const stacksResolved = resolve(stacksDir);

  if (resolved === stacksResolved) {
    return basename(stacksResolved);
  }

  return basename(resolved);
};

import { readdirSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { parseComposeFile, resolveIncludes } from "./compose-parser";
import { deriveName, selectStructure } from "./stack-structures";
import type { StructureContext } from "./stack-structures";
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

  // Collect all candidate compose files up to 2 levels deep
  const MAX_DEPTH = 2;
  const candidates: { path: string; dir: string }[] = [];

  const scan = (dir: string, depth: number) => {
    const composeFile = findComposeFile(dir);
    if (composeFile) {
      candidates.push({ path: composeFile, dir });
    }

    if (depth >= MAX_DEPTH) {
      return;
    }

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        scan(join(dir, entry.name), depth + 1);
      }
    }
  };

  scan(absoluteDir, 0);

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

    const context: StructureContext = {
      entrypoint: absolutePath,
      rootDir: absoluteDir,
      parsed: parseComposeFile(absolutePath),
      parse: parseComposeFile,
      resolveIncludes,
      deriveName,
    };

    stacks.push(...selectStructure(context).build(context));
  }

  return ensureUniqueNames(stacks).sort((left, right) => left.name.localeCompare(right.name));
};

/**
 * Disambiguates stacks that resolved to the same display name (e.g. two `compose.yml`
 * files in directories of the same name) by appending a numeric suffix.
 */
const ensureUniqueNames = (stacks: Stack[]): Stack[] => {
  const seen = new Map<string, number>();

  for (const stack of stacks) {
    const count = seen.get(stack.name) ?? 0;
    seen.set(stack.name, count + 1);
    if (count > 0) {
      stack.name = `${stack.name}-${count + 1}`;
    }
  }

  return stacks;
};

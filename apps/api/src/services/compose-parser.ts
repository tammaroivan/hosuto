import { parse } from "yaml";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join, relative, isAbsolute } from "node:path";
import type { ComposeFile } from "@hosuto/shared";

interface ParsedCompose {
  name?: string;
  services: string[];
  includes: IncludeEntry[];
  envFiles: string[];
  hasBuild: boolean;
  rawContent: string;
}

interface IncludeEntry {
  path: string;
  envFile?: string;
  projectDirectory?: string;
}

/**
 * Parses a Docker Compose file and extracts service names, includes, and environment files.
 *
 * @param filePath - The path to the Docker Compose file to parse.
 * @returns An object containing the parsed compose configuration with services, includes, and environment files.
 */
export const parseComposeFile = (filePath: string): ParsedCompose => {
  const absolutePath = resolve(filePath);
  const content = readFileSync(absolutePath, "utf-8");

  let doc: Record<string, unknown> | null;
  try {
    doc = parse(content);
  } catch {
    return { services: [], includes: [], envFiles: [], hasBuild: false, rawContent: content };
  }

  if (!doc || typeof doc !== "object") {
    return { services: [], includes: [], envFiles: [], hasBuild: false, rawContent: content };
  }

  const services = doc.services ? Object.keys(doc.services) : [];
  const name = doc.name as string | undefined;

  const envFiles: string[] = [];
  if (doc.services) {
    for (const service of Object.values(doc.services) as Record<string, unknown>[]) {
      if (!service?.env_file) {
        continue;
      }

      if (typeof service.env_file === "string") {
        envFiles.push(service.env_file);
      } else if (Array.isArray(service.env_file)) {
        for (const entry of service.env_file) {
          if (typeof entry === "string") {
            envFiles.push(entry);
          } else if (entry && typeof entry === "object" && "path" in entry) {
            envFiles.push(entry.path as string);
          }
        }
      }
    }
  }

  const includes: IncludeEntry[] = [];
  if (Array.isArray(doc.include)) {
    for (const entry of doc.include) {
      if (typeof entry === "string") {
        includes.push({ path: entry });
      } else if (entry && typeof entry === "object" && "path" in entry) {
        includes.push({
          path: entry.path as string,
          envFile: entry.env_file as string | undefined,
          projectDirectory: entry.project_directory as string | undefined,
        });
      }
    }
  }

  const hasBuild = doc.services
    ? Object.values(doc.services as Record<string, Record<string, unknown>>).some(
        service => service && typeof service === "object" && "build" in service,
      )
    : false;

  return { name, services, includes, envFiles: [...new Set(envFiles)], hasBuild, rawContent: content };
};

/**
 * Resolves all included Docker Compose files recursively, starting from an entrypoint file.
 * Detects and handles circular includes, missing files, and maintains a record of all processed files.
 *
 * @param entrypoint - The path to the main Docker Compose file to start parsing from
 * @param stacksDir - The base directory for resolving relative paths
 * @returns An array of resolved compose files with their metadata and contents
 */
export const resolveIncludes = (entrypoint: string, stacksDir: string): ComposeFile[] => {
  const absoluteEntry = resolve(entrypoint);
  const absoluteStacksDir = resolve(stacksDir);
  const visited = new Set<string>();
  const files: ComposeFile[] = [];

  const walk = (filePath: string, includedBy: string | null): void => {
    const absolutePath = resolve(filePath);

    if (visited.has(absolutePath)) {
      console.warn(`Circular include detected: ${absolutePath}`);
      return;
    }

    if (!existsSync(absolutePath)) {
      console.warn(`Included file not found: ${absolutePath}`);
      return;
    }

    visited.add(absolutePath);

    const parsed = parseComposeFile(absolutePath);

    const relativePath = absolutePath.startsWith(absoluteStacksDir)
      ? relative(absoluteStacksDir, absolutePath)
      : absolutePath;

    const implicitEnv = join(dirname(absolutePath), ".env");
    const envFiles =
      parsed.envFiles.includes(".env") || !existsSync(implicitEnv)
        ? parsed.envFiles
        : [".env", ...parsed.envFiles];

    files.push({
      path: absolutePath,
      relativePath,
      content: parsed.rawContent,
      services: parsed.services,
      envFiles,
      includedBy,
    });

    const fileDir = dirname(absolutePath);
    for (const include of parsed.includes) {
      const includePath = isAbsolute(include.path) ? include.path : resolve(fileDir, include.path);
      walk(includePath, absolutePath);

      // If the include entry has an env_file, attach it to the included file's envFiles
      if (include.envFile) {
        const includedFile = files.find(file => file.path === resolve(includePath));
        if (includedFile && !includedFile.envFiles.includes(include.envFile)) {
          includedFile.envFiles.push(include.envFile);
        }
      }
    }
  };

  walk(absoluteEntry, null);
  return files;
};

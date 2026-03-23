import { existsSync, statSync, readFileSync, writeFileSync, renameSync, unlinkSync } from "node:fs";
import { resolve, relative, basename, dirname, join, extname } from "node:path";
import { realpathSync } from "node:fs";
import { scanStacksDirectory } from "./stack-scanner";
import { resolveIncludes } from "./compose-parser";
import { composeConfig, composeUp } from "./compose-cli";
import type {
  FileNode,
  FileContent,
  FileType,
  StackFileTree,
  FileValidationResult,
} from "@hosuto/shared";
import type { ComposeResult } from "./compose-cli";
import { MAX_FILE_SIZE } from "@hosuto/shared";

const COMPOSE_EXTENSIONS = new Set([".yml", ".yaml"]);
const ENV_PATTERN = /^\.env/;

/**
 * Detects file type from its basename and extension.
 */
export const detectFileType = (filePath: string): FileType => {
  const name = basename(filePath);
  const ext = extname(filePath);

  if (COMPOSE_EXTENSIONS.has(ext)) {
    return "compose";
  }
  if (ENV_PATTERN.test(name)) {
    return "env";
  }

  return "other";
};

/**
 * Resolves a relative path within a stack directory and validates it stays
 * within the stacks directory boundary. Prevents path traversal and symlink escapes.
 */
export const resolveAndValidatePath = (
  stackDir: string,
  relativePath: string,
  stacksDir: string,
): string => {
  const absoluteStacksDir = realpathSync(resolve(stacksDir));
  const candidate = resolve(stackDir, relativePath);

  // Check the candidate is within stacks dir before following symlinks
  if (!candidate.startsWith(absoluteStacksDir)) {
    throw new PathSecurityError(`Path escapes stacks directory: ${relativePath}`);
  }

  // If the file exists, also check the resolved real path (follows symlinks)
  if (existsSync(candidate)) {
    const real = realpathSync(candidate);
    if (!real.startsWith(absoluteStacksDir)) {
      throw new PathSecurityError(`Symlink escapes stacks directory: ${relativePath}`);
    }
  }

  return candidate;
};

export class PathSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathSecurityError";
  }
}

/**
 * Checks if a file appears to be binary by scanning for null bytes.
 */
const isBinaryFile = (filePath: string): boolean => {
  const buffer = readFileSync(filePath).subarray(0, 8192);
  for (const byte of buffer) {
    if (byte === 0) {
      return true;
    }
  }

  return false;
};

/**
 * Finds a stack by name and returns its directory and entrypoint.
 */
const findStack = (
  stackName: string,
  stacksDir: string,
): { stackDir: string; entrypoint: string } | null => {
  const stacks = scanStacksDirectory(stacksDir);
  const stack = stacks.find((s) => s.name === stackName);
  if (!stack) {
    return null;
  }

  return {
    stackDir: dirname(stack.entrypoint),
    entrypoint: stack.entrypoint,
  };
};

/**
 * Returns the file tree for a stack, including all compose files and their env files.
 */
export const getStackFileTree = (stackName: string, stacksDir: string): StackFileTree | null => {
  const stack = findStack(stackName, stacksDir);
  if (!stack) {
    return null;
  }

  const absoluteStacksDir = resolve(stacksDir);
  const composeFiles = resolveIncludes(stack.entrypoint, stacksDir);

  const files: FileNode[] = [];

  for (const cf of composeFiles) {
    files.push({
      path: cf.path,
      relativePath: cf.relativePath,
      name: basename(cf.path),
      type: "compose",
      content: cf.content,
      includedBy: cf.includedBy,
    });

    // Add env files referenced by this compose file
    const cfDir = dirname(cf.path);
    for (const envFile of cf.envFiles) {
      const envPath = resolve(cfDir, envFile);
      if (!existsSync(envPath)) {
        continue;
      }

      const envRelative = relative(absoluteStacksDir, envPath);
      // Avoid duplicates
      if (files.some((f) => f.path === envPath)) {
        continue;
      }

      files.push({
        path: envPath,
        relativePath: envRelative,
        name: basename(envPath),
        type: "env",
        content: readFileSync(envPath, "utf-8"),
        includedBy: cf.path,
      });
    }
  }

  return {
    stackName,
    stackDir: stack.stackDir,
    entrypoint: stack.entrypoint,
    files,
  };
};

/**
 * Reads a single file's content with metadata.
 */
export const getFileContent = (
  stackName: string,
  relativePath: string,
  stacksDir: string,
): FileContent | null => {
  const stack = findStack(stackName, stacksDir);
  if (!stack) {
    return null;
  }

  const filePath = resolveAndValidatePath(stack.stackDir, relativePath, stacksDir);

  if (!existsSync(filePath)) {
    return null;
  }

  const stat = statSync(filePath);
  if (stat.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE} bytes`);
  }

  if (isBinaryFile(filePath)) {
    throw new Error("Binary files are not supported");
  }

  const content = readFileSync(filePath, "utf-8");

  return {
    path: filePath,
    relativePath,
    content,
    type: detectFileType(filePath),
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
  };
};

/**
 * Writes content to a file atomically (write to temp, then rename).
 * Creates the file if it doesn't exist, as long as the path is valid.
 */
export const writeFile = (
  stackName: string,
  relativePath: string,
  content: string,
  stacksDir: string,
): FileContent => {
  const stack = findStack(stackName, stacksDir);
  if (!stack) {
    throw new Error(`Stack not found: ${stackName}`);
  }

  const filePath = resolveAndValidatePath(stack.stackDir, relativePath, stacksDir);
  const fileDir = dirname(filePath);

  if (!existsSync(fileDir)) {
    throw new Error(`Directory does not exist: ${fileDir}`);
  }

  // Atomic write: temp file in same directory, then rename
  const tmpPath = join(fileDir, `.hosuto-tmp-${Date.now()}`);
  try {
    writeFileSync(tmpPath, content, "utf-8");
    renameSync(tmpPath, filePath);
  } catch (err) {
    // Clean up temp file on failure
    try {
      if (existsSync(tmpPath)) {
        unlinkSync(tmpPath);
      }
    } catch {
      // ignore cleanup errors
    }

    throw err;
  }

  const stat = statSync(filePath);

  return {
    path: filePath,
    relativePath,
    content,
    type: detectFileType(filePath),
    size: stat.size,
    lastModified: stat.mtime.toISOString(),
  };
};

/**
 * Validates a stack's compose configuration using `docker compose config`.
 */
export const validateCompose = async (
  stackName: string,
  stacksDir: string,
): Promise<FileValidationResult | null> => {
  const stack = findStack(stackName, stacksDir);
  if (!stack) {
    return null;
  }

  const result = await composeConfig(stack.entrypoint);

  return {
    valid: result.success,
    output: result.stdout,
    errors: result.stderr,
  };
};

/**
 * Applies a stack's compose configuration using `docker compose up -d`.
 */
export const applyCompose = async (
  stackName: string,
  stacksDir: string,
): Promise<ComposeResult | null> => {
  const stack = findStack(stackName, stacksDir);
  if (!stack) {
    return null;
  }

  return composeUp(stack.entrypoint);
};

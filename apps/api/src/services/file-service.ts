import {
  existsSync,
  statSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  mkdtempSync,
  cpSync,
  rmSync,
  readdirSync,
} from "node:fs";
import { resolve, relative, basename, dirname, join, extname } from "node:path";
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { scanStacksDirectory } from "./stack-scanner";
import { resolveIncludes } from "./compose-parser";
import { composeConfig, composeUp } from "./compose-cli";
import type {
  FileNode,
  FileContent,
  FileType,
  RenameResult,
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
 * Resolves a path relative to stacksDir and validates it stays within bounds.
 * Prevents path traversal and symlink escapes.
 */
export const resolveAndValidatePath = (relativePath: string, stacksDir: string): string => {
  const absoluteStacksDir = realpathSync(resolve(stacksDir));
  const candidate = resolve(absoluteStacksDir, relativePath);

  if (!candidate.startsWith(absoluteStacksDir)) {
    throw new PathSecurityError(`Path escapes stacks directory: ${relativePath}`);
  }

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
  const stack = stacks.find(stack => stack.name === stackName);
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
 * All relativePath values are relative to stacksDir.
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
      relativePath: relative(absoluteStacksDir, cf.path),
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

      // Avoid duplicates
      if (files.some(file => file.path === envPath)) {
        continue;
      }

      files.push({
        path: envPath,
        relativePath: relative(absoluteStacksDir, envPath),
        name: basename(envPath),
        type: "env",
        content: readFileSync(envPath, "utf-8"),
        includedBy: cf.path,
      });
    }
  }

  const knownPaths = new Set(files.map(file => file.path));
  const stackDirEntries = readdirSync(stack.stackDir);
  for (const entry of stackDirEntries) {
    const fullPath = join(stack.stackDir, entry);
    if (knownPaths.has(fullPath)) {
      continue;
    }

    const isEnv = entry.startsWith(".env");
    const isYaml = entry.endsWith(".yml") || entry.endsWith(".yaml");

    if (!isEnv && !isYaml) {
      continue;
    }

    try {
      const stat = statSync(fullPath);
      if (!stat.isFile() || stat.size > MAX_FILE_SIZE) {
        continue;
      }
    } catch {
      continue;
    }

    files.push({
      path: fullPath,
      relativePath: relative(absoluteStacksDir, fullPath),
      name: entry,
      type: isEnv ? "env" : "compose",
      content: readFileSync(fullPath, "utf-8"),
      includedBy: null,
    });
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
 * relativePath is relative to stacksDir.
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

  const filePath = resolveAndValidatePath(relativePath, stacksDir);

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
 * relativePath is relative to stacksDir.
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

  const filePath = resolveAndValidatePath(relativePath, stacksDir);
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
 * Renames a file on disk. Reports which compose files reference the old name.
 * Paths are relative to stacksDir.
 */
export const renameFile = (
  stackName: string,
  oldRelativePath: string,
  newRelativePath: string,
  stacksDir: string,
): RenameResult => {
  const stack = findStack(stackName, stacksDir);
  if (!stack) {
    throw new Error(`Stack not found: ${stackName}`);
  }

  const oldAbsolute = resolveAndValidatePath(oldRelativePath, stacksDir);
  const newAbsolute = resolveAndValidatePath(newRelativePath, stacksDir);

  if (!existsSync(oldAbsolute)) {
    throw new Error(`File not found: ${oldRelativePath}`);
  }
  if (existsSync(newAbsolute)) {
    throw new Error(`File already exists: ${newRelativePath}`);
  }

  renameSync(oldAbsolute, newAbsolute);

  return {
    oldPath: oldRelativePath,
    newPath: newRelativePath,
  };
};

/**
 * Validates a stack's compose configuration using `docker compose config`.
 * fileOverrides keys are relative to stacksDir.
 */
export const validateCompose = async (
  stackName: string,
  stacksDir: string,
  fileOverrides?: Record<string, string>,
): Promise<FileValidationResult | null> => {
  const stack = findStack(stackName, stacksDir);
  if (!stack) {
    return null;
  }

  if (!fileOverrides || Object.keys(fileOverrides).length === 0) {
    const result = await composeConfig(stack.entrypoint);
    return { valid: result.success, output: result.stdout, errors: result.stderr };
  }

  // Copy stack dir to temp, apply overrides, validate, clean up
  const tmpDir = mkdtempSync(join(tmpdir(), "hosuto-validate-"));
  const absoluteStacksDir = resolve(stacksDir);
  try {
    cpSync(stack.stackDir, tmpDir, { recursive: true });

    const overrideEntries = Object.entries(fileOverrides);
    for (const [relativePath, content] of overrideEntries) {
      // Convert stacksDir-relative path to stackDir-relative for the temp copy
      const absolutePath = resolve(absoluteStacksDir, relativePath);
      const stackRelative = relative(stack.stackDir, absolutePath);
      writeFileSync(join(tmpDir, stackRelative), content, "utf-8");
    }

    const tmpEntrypoint = join(tmpDir, basename(stack.entrypoint));
    const result = await composeConfig(tmpEntrypoint);

    return {
      valid: result.success,
      output: result.stdout,
      errors: result.stderr,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
};

/**
 * Applies a Docker Compose stack by starting its services.
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


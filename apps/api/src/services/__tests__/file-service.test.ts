import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import {
  detectFileType,
  resolveAndValidatePath,
  getStackFileTree,
  getFileContent,
  writeFile,
  PathSecurityError,
} from "../file-service";

const TEST_DIR = join(import.meta.dirname, "__fixtures_files__");
const STACKS_DIR = join(TEST_DIR, "stacks");

const writeFixture = (relativePath: string, content: string) => {
  const fullPath = join(STACKS_DIR, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });

  const lines = content
    .replace(/^\n/, "")
    .replace(/\n\s*$/, "\n")
    .split("\n");
  const indent = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)![0].length),
  );

  writeFileSync(fullPath, lines.map((line) => line.slice(indent)).join("\n"));
  return fullPath;
};

beforeEach(() => {
  mkdirSync(STACKS_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("detectFileType", () => {
  it("detects compose files by extension", () => {
    expect(detectFileType("docker-compose.yml")).toBe("compose");
    expect(detectFileType("compose.yaml")).toBe("compose");
    expect(detectFileType("/path/to/docker-compose.media.yml")).toBe("compose");
  });

  it("detects env files by name", () => {
    expect(detectFileType(".env")).toBe("env");
    expect(detectFileType(".env.local")).toBe("env");
    expect(detectFileType(".env.production")).toBe("env");
    expect(detectFileType("/path/to/.env")).toBe("env");
  });

  it("returns other for unknown types", () => {
    expect(detectFileType("README.md")).toBe("other");
    expect(detectFileType("Dockerfile")).toBe("other");
    expect(detectFileType("config.json")).toBe("other");
  });
});

describe("resolveAndValidatePath", () => {
  it("resolves valid paths within stacks dir", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");
    const stackDir = join(STACKS_DIR, "mystack");

    const result = resolveAndValidatePath(stackDir, "docker-compose.yml", STACKS_DIR);

    expect(result).toBe(join(stackDir, "docker-compose.yml"));
  });

  it("rejects path traversal with ..", () => {
    const stackDir = join(STACKS_DIR, "mystack");
    mkdirSync(stackDir, { recursive: true });

    expect(() => resolveAndValidatePath(stackDir, "../../etc/passwd", STACKS_DIR)).toThrow(
      PathSecurityError,
    );
  });

  it("rejects symlinks pointing outside stacks dir", () => {
    const stackDir = join(STACKS_DIR, "mystack");
    mkdirSync(stackDir, { recursive: true });

    // Create a symlink pointing outside stacks dir
    const outsideFile = join(TEST_DIR, "outside.txt");
    writeFileSync(outsideFile, "secret");
    symlinkSync(outsideFile, join(stackDir, "escape.txt"));

    expect(() => resolveAndValidatePath(stackDir, "escape.txt", STACKS_DIR)).toThrow(
      PathSecurityError,
    );
  });

  it("allows symlinks within stacks dir", () => {
    const stackDir = join(STACKS_DIR, "mystack");
    mkdirSync(stackDir, { recursive: true });

    const targetFile = join(stackDir, "real.yml");
    writeFileSync(targetFile, "services: {}");
    symlinkSync(targetFile, join(stackDir, "link.yml"));

    const result = resolveAndValidatePath(stackDir, "link.yml", STACKS_DIR);
    expect(result).toBe(join(stackDir, "link.yml"));
  });
});

describe("getStackFileTree", () => {
  it("returns file tree with compose files", () => {
    writeFixture(
      "mystack/docker-compose.yml",
      `
        services:
          web:
            image: nginx
      `,
    );

    const tree = getStackFileTree("mystack", STACKS_DIR);

    expect(tree).not.toBeNull();
    expect(tree!.stackName).toBe("mystack");
    expect(tree!.files.length).toBeGreaterThanOrEqual(1);
    expect(tree!.files[0].type).toBe("compose");
    expect(tree!.files[0].name).toBe("docker-compose.yml");
  });

  it("includes env files referenced by compose files", () => {
    writeFixture(
      "withenv/docker-compose.yml",
      `
        services:
          web:
            image: nginx
            env_file: .env
      `,
    );
    writeFixture("withenv/.env", "PORT=3000");

    const tree = getStackFileTree("withenv", STACKS_DIR);

    expect(tree).not.toBeNull();
    const envFile = tree!.files.find((f) => f.type === "env");
    expect(envFile).toBeDefined();
    expect(envFile!.name).toBe(".env");
    expect(envFile!.content).toBe("PORT=3000");
  });

  it("returns null for unknown stack", () => {
    const tree = getStackFileTree("nonexistent", STACKS_DIR);
    expect(tree).toBeNull();
  });
});

describe("getFileContent", () => {
  it("reads file content with metadata", () => {
    writeFixture(
      "mystack/docker-compose.yml",
      `
        services:
          web:
            image: nginx
      `,
    );

    const file = getFileContent("mystack", "docker-compose.yml", STACKS_DIR);

    expect(file).not.toBeNull();
    expect(file!.content).toContain("image: nginx");
    expect(file!.type).toBe("compose");
    expect(file!.size).toBeGreaterThan(0);
    expect(file!.lastModified).toBeTruthy();
  });

  it("returns null for nonexistent file", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    const file = getFileContent("mystack", "nonexistent.yml", STACKS_DIR);
    expect(file).toBeNull();
  });

  it("returns null for unknown stack", () => {
    const file = getFileContent("nonexistent", "docker-compose.yml", STACKS_DIR);
    expect(file).toBeNull();
  });

  it("throws for path traversal", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    expect(() => getFileContent("mystack", "../../etc/passwd", STACKS_DIR)).toThrow(
      PathSecurityError,
    );
  });
});

describe("writeFile", () => {
  it("writes content atomically", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    const newContent = "services:\n  web:\n    image: nginx:latest\n";
    const result = writeFile("mystack", "docker-compose.yml", newContent, STACKS_DIR);

    expect(result.content).toBe(newContent);
    expect(result.type).toBe("compose");

    // Verify actual file content on disk
    const onDisk = readFileSync(result.path, "utf-8");
    expect(onDisk).toBe(newContent);
  });

  it("creates new files within stack directory", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    const result = writeFile("mystack", ".env", "PORT=8080", STACKS_DIR);

    expect(result.type).toBe("env");
    const onDisk = readFileSync(result.path, "utf-8");
    expect(onDisk).toBe("PORT=8080");
  });

  it("throws for unknown stack", () => {
    expect(() => writeFile("nonexistent", "test.yml", "content", STACKS_DIR)).toThrow(
      "Stack not found",
    );
  });

  it("throws for path traversal", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    expect(() => writeFile("mystack", "../../escape.yml", "content", STACKS_DIR)).toThrow(
      PathSecurityError,
    );
  });
});

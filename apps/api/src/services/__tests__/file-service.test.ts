import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import {
  detectFileType,
  resolveAndValidatePath,
  getStackFileTree,
  getFileContent,
  writeFile,
  renameFile,
  getFileHistory,
  getHistoryContent,
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
    ...lines.filter(line => line.trim()).map(line => line.match(/^\s*/)![0].length),
  );

  writeFileSync(fullPath, lines.map(line => line.slice(indent)).join("\n"));
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

    const result = resolveAndValidatePath("mystack/docker-compose.yml", STACKS_DIR);

    expect(result).toBe(join(STACKS_DIR, "mystack/docker-compose.yml"));
  });

  it("rejects path traversal with ..", () => {
    mkdirSync(join(STACKS_DIR, "mystack"), { recursive: true });

    expect(() => resolveAndValidatePath("../../etc/passwd", STACKS_DIR)).toThrow(PathSecurityError);
  });

  it("rejects symlinks pointing outside stacks dir", () => {
    const stackDir = join(STACKS_DIR, "mystack");
    mkdirSync(stackDir, { recursive: true });

    const outsideFile = join(TEST_DIR, "outside.txt");
    writeFileSync(outsideFile, "secret");
    symlinkSync(outsideFile, join(stackDir, "escape.txt"));

    expect(() => resolveAndValidatePath("mystack/escape.txt", STACKS_DIR)).toThrow(
      PathSecurityError,
    );
  });

  it("allows symlinks within stacks dir", () => {
    const stackDir = join(STACKS_DIR, "mystack");
    mkdirSync(stackDir, { recursive: true });

    const targetFile = join(stackDir, "real.yml");
    writeFileSync(targetFile, "services: {}");
    symlinkSync(targetFile, join(stackDir, "link.yml"));

    const result = resolveAndValidatePath("mystack/link.yml", STACKS_DIR);
    expect(result).toBe(join(stackDir, "link.yml"));
  });
});

describe("getStackFileTree", () => {
  it("returns file tree with stacksDir-relative paths", () => {
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
    expect(tree!.files[0].relativePath).toBe("mystack/docker-compose.yml");
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
    const envFile = tree!.files.find(f => f.type === "env");
    expect(envFile).toBeDefined();
    expect(envFile!.name).toBe(".env");
    expect(envFile!.relativePath).toBe("withenv/.env");
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

    const file = getFileContent("mystack", "mystack/docker-compose.yml", STACKS_DIR);

    expect(file).not.toBeNull();
    expect(file!.content).toContain("image: nginx");
    expect(file!.type).toBe("compose");
    expect(file!.size).toBeGreaterThan(0);
    expect(file!.lastModified).toBeTruthy();
  });

  it("returns null for nonexistent file", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    const file = getFileContent("mystack", "mystack/nonexistent.yml", STACKS_DIR);
    expect(file).toBeNull();
  });

  it("returns null for unknown stack", () => {
    const file = getFileContent("nonexistent", "nonexistent/docker-compose.yml", STACKS_DIR);
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
    const result = writeFile("mystack", "mystack/docker-compose.yml", newContent, STACKS_DIR);

    expect(result.content).toBe(newContent);
    expect(result.type).toBe("compose");

    const onDisk = readFileSync(result.path, "utf-8");
    expect(onDisk).toBe(newContent);
  });

  it("creates new files within stack directory", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    const result = writeFile("mystack", "mystack/.env", "PORT=8080", STACKS_DIR);

    expect(result.type).toBe("env");
    const onDisk = readFileSync(result.path, "utf-8");
    expect(onDisk).toBe("PORT=8080");
  });

  it("throws for unknown stack", () => {
    expect(() => writeFile("nonexistent", "nonexistent/test.yml", "content", STACKS_DIR)).toThrow(
      "Stack not found",
    );
  });

  it("throws for path traversal", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    expect(() => writeFile("mystack", "../../escape.yml", "content", STACKS_DIR)).toThrow(
      PathSecurityError,
    );
  });

  it("creates a backup on overwrite", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");
    writeFile(
      "mystack",
      "mystack/docker-compose.yml",
      "services:\n  web:\n    image: nginx\n",
      STACKS_DIR,
    );

    const versions = getFileHistory("mystack", "mystack/docker-compose.yml", STACKS_DIR);
    expect(versions).not.toBeNull();
    expect(versions!.length).toBe(1);
  });
});

describe("renameFile", () => {
  it("renames a file on disk", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");
    writeFixture("mystack/.env", "PORT=3000");

    const result = renameFile("mystack", "mystack/.env", "mystack/.env.local", STACKS_DIR);

    expect(result.newPath).toBe("mystack/.env.local");
    const content = getFileContent("mystack", "mystack/.env.local", STACKS_DIR);
    expect(content).not.toBeNull();
    expect(content!.content).toBe("PORT=3000");
  });

  it("reports affected files that reference old name", () => {
    writeFixture(
      "mystack/docker-compose.yml",
      `
        include:
          - docker-compose.media.yml
        services:
          web:
            image: nginx
      `,
    );
    writeFixture(
      "mystack/docker-compose.media.yml",
      `
        services:
          plex:
            image: plex
      `,
    );

    const result = renameFile(
      "mystack",
      "mystack/docker-compose.media.yml",
      "mystack/docker-compose.entertainment.yml",
      STACKS_DIR,
    );

    expect(result.affectedFiles).toContain("mystack/docker-compose.yml");
  });

  it("throws when target already exists", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");
    writeFixture("mystack/.env", "A=1");
    writeFixture("mystack/.env.local", "B=2");

    expect(() => renameFile("mystack", "mystack/.env", "mystack/.env.local", STACKS_DIR)).toThrow(
      "already exists",
    );
  });

  it("throws for unknown stack", () => {
    expect(() => renameFile("nope", "nope/a.yml", "nope/b.yml", STACKS_DIR)).toThrow(
      "Stack not found",
    );
  });
});

describe("getFileHistory / getHistoryContent", () => {
  it("returns empty array when no history", () => {
    writeFixture("mystack/docker-compose.yml", "services: {}");

    const versions = getFileHistory("mystack", "mystack/docker-compose.yml", STACKS_DIR);
    expect(versions).toEqual([]);
  });

  it("returns versions after saves", () => {
    writeFixture("mystack/docker-compose.yml", "v1");
    writeFile("mystack", "mystack/docker-compose.yml", "v2", STACKS_DIR);
    writeFile("mystack", "mystack/docker-compose.yml", "v3", STACKS_DIR);

    const versions = getFileHistory("mystack", "mystack/docker-compose.yml", STACKS_DIR);
    expect(versions).not.toBeNull();
    expect(versions!.length).toBe(2);
    expect(versions![0].timestamp >= versions![1].timestamp).toBe(true);
  });

  it("reads history content", () => {
    writeFixture("mystack/docker-compose.yml", "original");
    writeFile("mystack", "mystack/docker-compose.yml", "modified", STACKS_DIR);

    const versions = getFileHistory("mystack", "mystack/docker-compose.yml", STACKS_DIR);
    expect(versions!.length).toBe(1);

    const content = getHistoryContent("mystack", versions![0].filename, STACKS_DIR);
    expect(content).toBe("original");
  });

  it("returns null for unknown stack", () => {
    expect(getFileHistory("nope", "nope/file.yml", STACKS_DIR)).toBeNull();
    expect(getHistoryContent("nope", "file.bak", STACKS_DIR)).toBeNull();
  });
});

describe("getStackFileTree - unreferenced files", () => {
  it("includes unreferenced env files from stack directory", () => {
    writeFixture("mystack/docker-compose.yml", "services:\n  web:\n    image: nginx\n");
    writeFixture("mystack/.env.orphan", "ORPHAN=true");

    const tree = getStackFileTree("mystack", STACKS_DIR);
    expect(tree).not.toBeNull();

    const orphan = tree!.files.find(f => f.name === ".env.orphan");
    expect(orphan).toBeDefined();
    expect(orphan!.relativePath).toBe("mystack/.env.orphan");
    expect(orphan!.includedBy).toBeNull();
  });
});

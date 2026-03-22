import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseComposeFile, resolveIncludes } from "../compose-parser";

const TEST_DIR = join(import.meta.dirname, "__fixtures__");

function writeFixture(relativePath: string, content: string) {
  const fullPath = join(TEST_DIR, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });

  // Strip common leading whitespace so YAML can be indented with the test code
  const lines = content.replace(/^\n/, "").replace(/\n\s*$/, "\n").split("\n");
  const indent = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^\s*/)![0].length),
  );

  writeFileSync(fullPath, lines.map((line) => line.slice(indent)).join("\n"));
  return fullPath;
}

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("parseComposeFile", () => {
  it("extracts services from a simple compose file", () => {
    const path = writeFixture(
      "simple/docker-compose.yml",
      `
        services:
          web:
            image: nginx:latest
          db:
            image: postgres:16
      `,
    );

    const result = parseComposeFile(path);
    expect(result.services).toEqual(["web", "db"]);
    expect(result.includes).toEqual([]);
    expect(result.envFiles).toEqual([]);
  });

  it("extracts include directives — bare string form", () => {
    const path = writeFixture(
      "includes/docker-compose.yml",
      `
        include:
          - docker-compose.media.yml
          - docker-compose.network.yml
        services:
          app:
            image: node:20
      `,
    );

    const result = parseComposeFile(path);
    expect(result.services).toEqual(["app"]);
    expect(result.includes).toEqual([
      { path: "docker-compose.media.yml" },
      { path: "docker-compose.network.yml" },
    ]);
  });

  it("extracts include directives — object form with env_file", () => {
    const path = writeFixture(
      "includes-obj/docker-compose.yml",
      `
        include:
          - path: docker-compose.media.yml
            env_file: .env
          - path: docker-compose.gaming.yml
            env_file: .env.gaming
      `,
    );

    const result = parseComposeFile(path);
    expect(result.includes).toEqual([
      { path: "docker-compose.media.yml", envFile: ".env", projectDirectory: undefined },
      { path: "docker-compose.gaming.yml", envFile: ".env.gaming", projectDirectory: undefined },
    ]);
  });

  it("extracts env_file references from services", () => {
    const path = writeFixture(
      "envfiles/docker-compose.yml",
      `
        services:
          web:
            image: nginx
            env_file:
              - .env
              - .env.local
          db:
            image: postgres
            env_file: .env.db
      `,
    );

    const result = parseComposeFile(path);
    expect(result.envFiles).toEqual([".env", ".env.local", ".env.db"]);
  });

  it("extracts project name from YAML", () => {
    const path = writeFixture(
      "named/docker-compose.yml",
      `
        name: my-project
        services:
          app:
            image: node:20
      `,
    );

    const result = parseComposeFile(path);
    expect(result.name).toBe("my-project");
  });

  it("handles empty or invalid YAML gracefully", () => {
    const path = writeFixture("empty/docker-compose.yml", "");
    const result = parseComposeFile(path);
    expect(result.services).toEqual([]);
    expect(result.includes).toEqual([]);
  });

  it("handles compose file with only includes and no services", () => {
    const path = writeFixture(
      "include-only/docker-compose.yml",
      `
        include:
          - media.yml
      `,
    );

    const result = parseComposeFile(path);
    expect(result.services).toEqual([]);
    expect(result.includes).toHaveLength(1);
  });

  it("deduplicates env_file references", () => {
    const path = writeFixture(
      "dedup/docker-compose.yml",
      `
        services:
          web:
            image: nginx
            env_file: .env
          api:
            image: node
            env_file: .env
      `,
    );

    const result = parseComposeFile(path);
    expect(result.envFiles).toEqual([".env"]);
  });
});

describe("resolveIncludes", () => {
  it("resolves a single file with no includes", () => {
    const path = writeFixture(
      "single/docker-compose.yml",
      `
        services:
          web:
            image: nginx
      `,
    );

    const files = resolveIncludes(path, join(TEST_DIR, "single"));
    expect(files).toHaveLength(1);
    expect(files[0].services).toEqual(["web"]);
    expect(files[0].includedBy).toBeNull();
  });

  it("resolves nested includes", () => {
    writeFixture(
      "nested/docker-compose.media.yml",
      `
        services:
          plex:
            image: linuxserver/plex
          sonarr:
            image: linuxserver/sonarr
      `,
    );

    writeFixture(
      "nested/docker-compose.network.yml",
      `
        services:
          traefik:
            image: traefik:v3
      `,
    );

    const entrypoint = writeFixture(
      "nested/docker-compose.yml",
      `
        include:
          - docker-compose.media.yml
          - docker-compose.network.yml
        services:
          portainer:
            image: portainer/portainer-ce
      `,
    );

    const files = resolveIncludes(entrypoint, join(TEST_DIR, "nested"));

    expect(files).toHaveLength(3);

    // Entrypoint
    expect(files[0].services).toEqual(["portainer"]);
    expect(files[0].includedBy).toBeNull();

    // Media (included by entrypoint)
    expect(files[1].services).toEqual(["plex", "sonarr"]);
    expect(files[1].includedBy).toBe(entrypoint);

    // Network (included by entrypoint)
    expect(files[2].services).toEqual(["traefik"]);
    expect(files[2].includedBy).toBe(entrypoint);
  });

  it("resolves deeply nested includes (include within include)", () => {
    writeFixture(
      "deep/base.yml",
      `
        services:
          redis:
            image: redis:7
      `,
    );

    const midPath = writeFixture(
      "deep/mid.yml",
      `
        include:
          - base.yml
        services:
          api:
            image: node:20
      `,
    );

    const entrypoint = writeFixture(
      "deep/docker-compose.yml",
      `
        include:
          - mid.yml
        services:
          web:
            image: nginx
      `,
    );

    const files = resolveIncludes(entrypoint, join(TEST_DIR, "deep"));

    expect(files).toHaveLength(3);
    expect(files[0].services).toEqual(["web"]); // entrypoint
    expect(files[1].services).toEqual(["api"]); // mid
    expect(files[1].includedBy).toBe(entrypoint);
    expect(files[2].services).toEqual(["redis"]); // base
    expect(files[2].includedBy).toBe(midPath);
  });

  it("detects circular includes without crashing", () => {
    writeFixture(
      "circular/a.yml",
      `
        include:
          - b.yml
        services:
          a:
            image: alpine
      `,
    );

    writeFixture(
      "circular/b.yml",
      `
        include:
          - a.yml
        services:
          b:
            image: alpine
      `,
    );

    const entrypoint = join(TEST_DIR, "circular/a.yml");
    const files = resolveIncludes(entrypoint, join(TEST_DIR, "circular"));

    // Should get both files but not loop infinitely
    expect(files).toHaveLength(2);
  });

  it("handles missing included file gracefully", () => {
    const entrypoint = writeFixture(
      "missing/docker-compose.yml",
      `
        include:
          - does-not-exist.yml
        services:
          web:
            image: nginx
      `,
    );

    const files = resolveIncludes(entrypoint, join(TEST_DIR, "missing"));

    // Should have the entrypoint but skip the missing file
    expect(files).toHaveLength(1);
    expect(files[0].services).toEqual(["web"]);
  });

  it("resolves subdirectory includes", () => {
    writeFixture(
      "subdir/terminus/compose.yml",
      `
        services:
          terminus:
            image: terminus
      `,
    );

    const entrypoint = writeFixture(
      "subdir/docker-compose.yml",
      `
        include:
          - terminus/compose.yml
        services:
          main:
            image: alpine
      `,
    );

    const files = resolveIncludes(entrypoint, join(TEST_DIR, "subdir"));

    expect(files).toHaveLength(2);
    expect(files[1].services).toEqual(["terminus"]);
    expect(files[1].relativePath).toBe("terminus/compose.yml");
  });

  it("sets relativePath correctly for files within stacks dir", () => {
    const entrypoint = writeFixture(
      "relpath/docker-compose.yml",
      `
        services:
          web:
            image: nginx
      `,
    );

    const files = resolveIncludes(entrypoint, join(TEST_DIR, "relpath"));

    expect(files[0].relativePath).toBe("docker-compose.yml");
  });

  it("populates content field with raw YAML", () => {
    const entrypoint = writeFixture(
      "content/docker-compose.yml",
      `
        services:
          web:
            image: nginx
      `,
    );

    const files = resolveIncludes(entrypoint, join(TEST_DIR, "content"));
    expect(files[0].content).toContain("image: nginx");
  });
});

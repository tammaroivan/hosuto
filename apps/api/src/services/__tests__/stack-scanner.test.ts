import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { scanStacksDirectory } from "../stack-scanner";

const TEST_DIR = join(import.meta.dirname, "__fixtures_scanner__");

const writeFixture = (relativePath: string, content: string) => {
  const fullPath = join(TEST_DIR, relativePath);
  const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
  mkdirSync(dir, { recursive: true });

  // Strip common leading whitespace so YAML can be indented with the test code
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
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("scanStacksDirectory", () => {
  it("discovers standalone stacks in subdirectories", () => {
    writeFixture(
      "gaming/docker-compose.yml",
      `
        services:
          minecraft:
            image: itzg/minecraft-server
      `,
    );

    writeFixture(
      "media/docker-compose.yml",
      `
        services:
          plex:
            image: linuxserver/plex
      `,
    );

    const stacks = scanStacksDirectory(TEST_DIR);

    expect(stacks).toHaveLength(2);
    expect(stacks.map(stack => stack.name).sort()).toEqual(["gaming", "media"]);
    expect(stacks[0].files).toHaveLength(1);
    expect(stacks[1].files).toHaveLength(1);
  });

  it("discovers a root-level compose file as a stack", () => {
    writeFixture(
      "docker-compose.yml",
      `
        services:
          app:
            image: nginx
      `,
    );

    const stacks = scanStacksDirectory(TEST_DIR);

    expect(stacks).toHaveLength(1);
    expect(stacks[0].files).toHaveLength(1);
    expect(stacks[0].files[0].services).toEqual(["app"]);
  });

  it("resolves includes and groups them under the entrypoint stack", () => {
    writeFixture(
      "docker-compose.media.yml",
      `
        services:
          plex:
            image: linuxserver/plex
          sonarr:
            image: linuxserver/sonarr
      `,
    );

    writeFixture(
      "docker-compose.yml",
      `
        include:
          - docker-compose.media.yml
        services:
          portainer:
            image: portainer/portainer-ce
      `,
    );

    const stacks = scanStacksDirectory(TEST_DIR);

    // Should be ONE stack (the entrypoint), not two
    expect(stacks).toHaveLength(1);
    expect(stacks[0].files).toHaveLength(2);

    const allServices = stacks[0].files.flatMap(file => file.services);
    expect(allServices.sort()).toEqual(["plex", "portainer", "sonarr"]);
  });

  it("does not treat included files as standalone entrypoints", () => {
    writeFixture(
      "docker-compose.media.yml",
      `
        services:
          plex:
            image: linuxserver/plex
      `,
    );

    writeFixture(
      "docker-compose.yml",
      `
        include:
          - docker-compose.media.yml
        services:
          app:
            image: nginx
      `,
    );

    const stacks = scanStacksDirectory(TEST_DIR);
    expect(stacks).toHaveLength(1);
    expect(stacks[0].name).not.toBe("docker-compose.media");
  });

  it("uses YAML name field as stack name when present", () => {
    writeFixture(
      "mystack/docker-compose.yml",
      `
        name: custom-name
        services:
          app:
            image: nginx
      `,
    );

    const stacks = scanStacksDirectory(TEST_DIR);
    expect(stacks[0].name).toBe("custom-name");
  });

  it("falls back to directory name for stack name", () => {
    writeFixture(
      "home-automation/docker-compose.yml",
      `
        services:
          homeassistant:
            image: homeassistant/home-assistant
      `,
    );

    const stacks = scanStacksDirectory(TEST_DIR);
    expect(stacks[0].name).toBe("home-automation");
  });

  it("prefers docker-compose.yml over compose.yml", () => {
    writeFixture(
      "priority/docker-compose.yml",
      `
        services:
          from-docker-compose:
            image: nginx
      `,
    );

    writeFixture(
      "priority/compose.yml",
      `
        services:
          from-compose:
            image: nginx
      `,
    );

    const stacks = scanStacksDirectory(TEST_DIR);
    expect(stacks).toHaveLength(1);
    expect(stacks[0].files[0].services).toEqual(["from-docker-compose"]);
  });

  it("returns empty array for non-existent directory", () => {
    const stacks = scanStacksDirectory("/tmp/does-not-exist-hosuto-test");
    expect(stacks).toEqual([]);
  });

  it("returns empty array for directory with no compose files", () => {
    mkdirSync(join(TEST_DIR, "empty-subdir"), { recursive: true });
    writeFixture("not-a-compose.txt", "hello");

    const stacks = scanStacksDirectory(TEST_DIR);
    expect(stacks).toEqual([]);
  });

  it("returns stacks sorted by name", () => {
    writeFixture("zeta/docker-compose.yml", "services:\n  a:\n    image: alpine");
    writeFixture("alpha/docker-compose.yml", "services:\n  b:\n    image: alpine");
    writeFixture("mid/docker-compose.yml", "services:\n  c:\n    image: alpine");

    const stacks = scanStacksDirectory(TEST_DIR);
    expect(stacks.map(stack => stack.name)).toEqual(["alpha", "mid", "zeta"]);
  });

  it("handles mix of standalone and include-based stacks", () => {
    writeFixture(
      "gaming/docker-compose.yml",
      `
        services:
          minecraft:
            image: itzg/minecraft-server
      `,
    );

    writeFixture(
      "docker-compose.media.yml",
      `
        services:
          plex:
            image: linuxserver/plex
      `,
    );

    writeFixture(
      "docker-compose.yml",
      `
        include:
          - docker-compose.media.yml
        services:
          traefik:
            image: traefik
      `,
    );

    const stacks = scanStacksDirectory(TEST_DIR);

    expect(stacks).toHaveLength(2);
    const names = stacks.map(stack => stack.name).sort();
    expect(names).toContain("gaming");
  });

  it("sets containers to empty array and status to stopped", () => {
    writeFixture("test/docker-compose.yml", "services:\n  a:\n    image: alpine");

    const stacks = scanStacksDirectory(TEST_DIR);
    expect(stacks[0].containers).toEqual([]);
    expect(stacks[0].status).toBe("stopped");
  });

  it("discovers stacks two levels deep", () => {
    writeFixture("stacks/web/compose.yaml", "services:\n  nginx:\n    image: nginx:alpine");
    writeFixture(
      "stacks/database/compose.yaml",
      "services:\n  postgres:\n    image: postgres:16-alpine",
    );

    const stacks = scanStacksDirectory(TEST_DIR);

    expect(stacks).toHaveLength(2);
    expect(stacks.map(s => s.name).sort()).toEqual(["database", "web"]);
  });

  it("discovers stacks at mixed depths", () => {
    writeFixture("direct/docker-compose.yml", "services:\n  a:\n    image: alpine");
    writeFixture("nested/group/docker-compose.yml", "services:\n  b:\n    image: alpine");

    const stacks = scanStacksDirectory(TEST_DIR);

    expect(stacks).toHaveLength(2);
    expect(stacks.map(s => s.name).sort()).toEqual(["direct", "group"]);
  });

  it("does not scan beyond two levels deep", () => {
    writeFixture("a/b/c/docker-compose.yml", "services:\n  too-deep:\n    image: alpine");

    const stacks = scanStacksDirectory(TEST_DIR);

    expect(stacks).toEqual([]);
  });
});

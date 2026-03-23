import { describe, it, expect } from "vitest";
import { getImageUrl } from "../docker";

describe("getImageUrl", () => {
  it("links official Docker Hub images", () => {
    expect(getImageUrl("nginx:alpine")).toBe("https://hub.docker.com/_/nginx");
    expect(getImageUrl("postgres:16.2")).toBe("https://hub.docker.com/_/postgres");
    expect(getImageUrl("redis")).toBe("https://hub.docker.com/_/redis");
  });

  it("links namespaced Docker Hub images", () => {
    expect(getImageUrl("bitnami/redis:7.2")).toBe("https://hub.docker.com/r/bitnami/redis");
    expect(getImageUrl("linuxserver/prowlarr")).toBe(
      "https://hub.docker.com/r/linuxserver/prowlarr",
    );
  });

  it("links ghcr.io images to the registry", () => {
    expect(getImageUrl("ghcr.io/homarr-labs/homarr:latest")).toBe(
      "https://ghcr.io/homarr-labs/homarr",
    );
  });

  it("redirects lscr.io images to Docker Hub", () => {
    expect(getImageUrl("lscr.io/linuxserver/prowlarr:latest")).toBe(
      "https://hub.docker.com/r/linuxserver/prowlarr",
    );
  });

  it("redirects docker.io images to Docker Hub", () => {
    expect(getImageUrl("docker.io/library/nginx:latest")).toBe(
      "https://hub.docker.com/r/library/nginx",
    );
  });

  it("redirects registry.hub.docker.com images to Docker Hub", () => {
    expect(getImageUrl("registry.hub.docker.com/library/redis:7")).toBe(
      "https://hub.docker.com/r/library/redis",
    );
  });

  it("links unknown registries directly", () => {
    expect(getImageUrl("quay.io/prometheus/node-exporter:latest")).toBe(
      "https://quay.io/prometheus/node-exporter",
    );
  });

  it("strips tags from all formats", () => {
    expect(getImageUrl("nginx:1.25.3-alpine")).toBe("https://hub.docker.com/_/nginx");
    expect(getImageUrl("ghcr.io/org/app:v2.0.0-rc1")).toBe("https://ghcr.io/org/app");
  });
});

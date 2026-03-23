const DOCKER_HUB_MIRRORS = new Set(["lscr.io", "docker.io", "registry.hub.docker.com"]);

export const getImageUrl = (image: string): string => {
  const [nameWithRegistry] = image.split(":");
  const parts = nameWithRegistry.split("/");

  if (parts.length >= 3) {
    const registry = parts[0];
    const path = parts.slice(1).join("/");

    if (DOCKER_HUB_MIRRORS.has(registry)) {
      return `https://hub.docker.com/r/${path}`;
    }

    return `https://${registry}/${path}`;
  }

  if (parts.length === 2) {
    return `https://hub.docker.com/r/${parts[0]}/${parts[1]}`;
  }

  return `https://hub.docker.com/_/${parts[0]}`;
};

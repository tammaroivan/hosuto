import Docker from "dockerode";

export const dockerSocketPath = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

export const docker = new Docker({ socketPath: dockerSocketPath });

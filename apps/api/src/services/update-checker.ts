import { execFile } from "node:child_process";
import { docker } from "./docker-client";
import type { UpdateCheckResult, StackUpdateStatus } from "@hosuto/shared";

const execAsync = (cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> => {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
      }
    });
  });
};

const getLocalDigest = async (image: string): Promise<string | null> => {
  try {
    const imageObj = docker.getImage(image);
    const info = await imageObj.inspect();
    const digest = info.RepoDigests?.[0];

    if (!digest) {
      return null;
    }

    const atIndex = digest.indexOf("@");

    return atIndex >= 0 ? digest.slice(atIndex + 1) : null;
  } catch {
    return null;
  }
};

// Uses `docker buildx imagetools inspect` to get the manifest list digest
// matching what RepoDigests stores locally.
const getRemoteDigest = async (image: string): Promise<string | null> => {
  try {
    const { stdout } = await execAsync("docker", ["buildx", "imagetools", "inspect", image]);
    const match = stdout.match(/^Digest:\s+(sha256:[a-f0-9]+)/m);

    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

export const checkImageUpdate = async (
  image: string,
  service: string,
): Promise<UpdateCheckResult> => {
  try {
    const [localDigest, remoteDigest] = await Promise.all([
      getLocalDigest(image),
      getRemoteDigest(image),
    ]);

    if (!localDigest || !remoteDigest) {
      return {
        image,
        service,
        currentDigest: localDigest,
        remoteDigest,
        updateAvailable: false,
        error: !localDigest ? "Image not found locally" : "Could not check remote",
      };
    }

    return {
      image,
      service,
      currentDigest: localDigest,
      remoteDigest,
      updateAvailable: localDigest !== remoteDigest,
    };
  } catch (err) {
    return {
      image,
      service,
      currentDigest: null,
      remoteDigest: null,
      updateAvailable: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

const getStackImages = (
  containers: { image: string; serviceName: string | null; status: string }[],
): { image: string; service: string }[] => {
  const seen = new Set<string>();
  const images: { image: string; service: string }[] = [];

  for (const container of containers) {
    if (container.status === "not_created" || seen.has(container.image)) {
      continue;
    }

    seen.add(container.image);
    images.push({ image: container.image, service: container.serviceName ?? container.image });
  }

  return images;
};

export const checkStackUpdates = async (
  stackName: string,
  containers: { image: string; serviceName: string | null; status: string }[],
): Promise<StackUpdateStatus> => {
  const images = getStackImages(containers);

  const results = await Promise.all(
    images.map(({ image, service }) => checkImageUpdate(image, service)),
  );

  return {
    stackName,
    results,
    lastChecked: new Date().toISOString(),
    hasUpdates: results.some(result => result.updateAvailable),
  };
};

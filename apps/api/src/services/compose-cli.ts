import { execFile, spawn } from "node:child_process";
import { dirname } from "node:path";

export interface ComposeResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export const runCompose = (entrypoint: string, args: string[]): Promise<ComposeResult> => {
  return new Promise(resolve => {
    execFile(
      "docker",
      ["compose", "-f", entrypoint, ...args],
      { cwd: dirname(entrypoint) },
      (_error, stdout, stderr) => {
        resolve({
          success: !_error,
          stdout: stdout ?? "",
          stderr: stderr ?? "",
        });
      },
    );
  });
};

export const composeUp = async (
  entrypoint: string,
  services?: string[],
): Promise<ComposeResult> => {
  const args = ["up", "-d", ...(services ?? [])];

  return runCompose(entrypoint, args);
};

export const composeDown = async (entrypoint: string): Promise<ComposeResult> => {
  return runCompose(entrypoint, ["down"]);
};

export const composeRestart = async (entrypoint: string): Promise<ComposeResult> => {
  return runCompose(entrypoint, ["restart"]);
};

export const composePull = async (
  entrypoint: string,
  services?: string[],
): Promise<ComposeResult> => {
  const args = ["pull", ...(services ?? [])];

  return runCompose(entrypoint, args);
};

const DOCKER_LAYER_ID_RE = /^\s*([0-9a-f]{12})\s/;

export const runComposeStreaming = (
  entrypoint: string,
  args: string[],
  onLine: (line: string, key?: string) => void,
): Promise<ComposeResult> => {
  return new Promise(resolve => {
    const proc = spawn("docker", ["compose", "-f", entrypoint, ...args], {
      cwd: dirname(entrypoint),
    });

    let stdout = "";
    let stderr = "";

    const processChunk = (chunk: Buffer) => {
      const text = chunk.toString();
      const segments = text.split(/[\r\n]+/).filter(Boolean);
      for (const segment of segments) {
        const match = segment.match(DOCKER_LAYER_ID_RE);
        onLine(segment, match?.[1]);
      }

      return text;
    };

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += processChunk(chunk);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += processChunk(chunk);
    });

    proc.on("close", code => {
      resolve({ success: code === 0, stdout, stderr });
    });
  });
};

export const composeBuild = async (
  entrypoint: string,
  services?: string[],
): Promise<ComposeResult> => {
  const args = ["build", ...(services ?? [])];

  return runCompose(entrypoint, args);
};

export const composeBuildUp = async (entrypoint: string): Promise<ComposeResult> => {
  return runCompose(entrypoint, ["up", "-d", "--build"]);
};

export const composeConfig = async (entrypoint: string): Promise<ComposeResult> => {
  return runCompose(entrypoint, ["config"]);
};

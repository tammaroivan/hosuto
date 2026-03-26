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

export const runComposeStreaming = (
  entrypoint: string,
  args: string[],
  onLine: (line: string) => void,
): Promise<ComposeResult> => {
  return new Promise(resolve => {
    const proc = spawn("docker", ["compose", "-f", entrypoint, ...args], {
      cwd: dirname(entrypoint),
    });

    let stdout = "";
    let stderr = "";

    const processChunk = (chunk: Buffer) => {
      const text = chunk.toString();
      for (const line of text.split("\n").filter(Boolean)) {
        onLine(line);
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

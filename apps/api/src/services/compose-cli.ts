import { execFile } from "node:child_process";
import { dirname } from "node:path";

export interface ComposeResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export const runCompose = (entrypoint: string, args: string[]): Promise<ComposeResult> => {
  return new Promise((resolve) => {
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

export const composeConfig = async (entrypoint: string): Promise<ComposeResult> => {
  return runCompose(entrypoint, ["config"]);
};

import { execFile } from "node:child_process";
import { dirname } from "node:path";

export interface ComposeResult {
  success: boolean;
  stdout: string;
  stderr: string;
}

export function runCompose(entrypoint: string, args: string[]): Promise<ComposeResult> {
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
}

export async function composeUp(entrypoint: string, services?: string[]): Promise<ComposeResult> {
  const args = ["up", "-d", ...(services ?? [])];
  return runCompose(entrypoint, args);
}

export async function composeDown(entrypoint: string): Promise<ComposeResult> {
  return runCompose(entrypoint, ["down"]);
}

export async function composeRestart(entrypoint: string): Promise<ComposeResult> {
  return runCompose(entrypoint, ["restart"]);
}

export async function composePull(
  entrypoint: string,
  services?: string[],
): Promise<ComposeResult> {
  const args = ["pull", ...(services ?? [])];
  return runCompose(entrypoint, args);
}

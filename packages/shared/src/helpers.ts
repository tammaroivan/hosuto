import type { StackStatus } from "./types";

export const computeStackStatus = (running: number, expected: number): StackStatus => {
  const state =
    expected === 0 || running === 0 ? "stopped" : running >= expected ? "running" : "partial";
  return { state, running, expected };
};

import { basename, dirname } from "node:path";
import type { ParsedCompose } from "../compose-parser";
import { includeAggregatorStructure } from "./include-aggregator";
import { singleProjectStructure } from "./single-project";
import type { StackStructure, StructureContext } from "./types";

export type { StackStructure, StructureContext } from "./types";

/**
 * Registered layouts, tried in order; the first to `match` expands the candidate. To
 * add a layout, implement `StackStructure` here and list it above the catch-all
 * `singleProjectStructure` (specific before general).
 */
export const structures: StackStructure[] = [includeAggregatorStructure, singleProjectStructure];

/** Picks the first registered structure that recognises the candidate. */
export const selectStructure = (context: StructureContext): StackStructure => {
  return structures.find(structure => structure.matches(context)) ?? singleProjectStructure;
};

/**
 * Derives a stack display name for a compose file:
 * - an explicit top-level `name:` always wins
 * - `docker-compose.<x>.yml` / `compose.<x>.yml` -> `<x>`
 * - bare `compose.yml` / `docker-compose.yml` -> the parent directory name
 */
export const deriveName = (filePath: string, parsed: ParsedCompose): string => {
  if (parsed.name) {
    return parsed.name;
  }

  const base = basename(filePath).replace(/\.(ya?ml)$/i, "");
  const suffixed = base.match(/^(?:docker-)?compose\.(.+)$/i);
  if (suffixed) {
    return suffixed[1];
  }

  if (/^(?:docker-)?compose$/i.test(base)) {
    return basename(dirname(filePath));
  }

  return base;
};

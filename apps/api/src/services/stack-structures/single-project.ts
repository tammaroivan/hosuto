import type { Stack } from "@hosuto/shared";
import type { StackStructure, StructureContext } from "./types";

/**
 * Default fallback: one compose project (with any `include:`d files merged in) is a
 * single stack, matched to containers by project name.
 */
export const singleProjectStructure: StackStructure = {
  id: "single-project",

  matches(): boolean {
    return true;
  },

  build(context: StructureContext): Stack[] {
    const { entrypoint, rootDir, parsed, parse, resolveIncludes, deriveName } = context;
    const files = resolveIncludes(entrypoint, rootDir);
    const hasBuildDirectives = files.some(file => parse(file.path).hasBuild);

    return [
      {
        name: deriveName(entrypoint, parsed),
        entrypoint,
        files,
        containers: [],
        status: { state: "stopped", running: 0, expected: 0 },
        hasBuildDirectives,
        updates: null,
        serviceScope: null,
      },
    ];
  },
};

import { existsSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import type { Stack } from "@hosuto/shared";
import type { StackStructure, StructureContext } from "./types";

/**
 * A root file that only `include:`s other files and declares no services of its own.
 * Each direct include becomes a stack. Since all includes form one Docker project, every
 * slice shares the root `entrypoint` and a `serviceScope` and is matched by service (see
 * docker.ts). Requiring zero own services leaves the "shared base file" pattern as one
 * stack via the default structure.
 */
export const includeAggregatorStructure: StackStructure = {
  id: "include-aggregator",

  matches(context: StructureContext): boolean {
    return context.parsed.includes.length > 0 && context.parsed.services.length === 0;
  },

  build(context: StructureContext): Stack[] {
    const { entrypoint, rootDir, parsed, parse, resolveIncludes, deriveName } = context;
    const entrypointDir = dirname(entrypoint);

    const resolveInclude = (relativeOrAbsolute: string): string =>
      isAbsolute(relativeOrAbsolute)
        ? resolve(relativeOrAbsolute)
        : resolve(entrypointDir, relativeOrAbsolute);

    // Exclude the root and sibling includes from each slice's subtree so every service
    // lands in exactly one slice, even when files re-include their siblings or themselves.
    const boundaries = new Set<string>([resolve(entrypoint)]);
    for (const include of parsed.includes) {
      boundaries.add(resolveInclude(include.path));
    }

    const stacks: Stack[] = [];
    for (const include of parsed.includes) {
      const includePath = resolveInclude(include.path);
      if (!existsSync(includePath)) {
        continue;
      }

      const files = resolveIncludes(includePath, rootDir).filter(
        file => file.path === includePath || !boundaries.has(file.path),
      );
      const services = [...new Set(files.flatMap(file => file.services))];
      if (services.length === 0) {
        continue;
      }

      const includeParsed = parse(includePath);
      stacks.push({
        name: includeParsed.name || deriveName(includePath, includeParsed),
        entrypoint,
        files,
        containers: [],
        status: { state: "stopped", running: 0, expected: 0 },
        hasBuildDirectives: files.some(file => parse(file.path).hasBuild),
        updates: null,
        serviceScope: services,
      });
    }

    return stacks;
  },
};

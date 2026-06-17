import type { ComposeFile, Stack } from "@hosuto/shared";
import type { ParsedCompose } from "../compose-parser";

/** Inputs a structure uses to expand a candidate, injected to keep structures testable. */
export interface StructureContext {
  /** Absolute path to the candidate (top-level) compose file. */
  entrypoint: string;
  /** Absolute path to the stacks root directory. */
  rootDir: string;
  /** Parsed form of the entrypoint file. */
  parsed: ParsedCompose;
  /** Parse any compose file by absolute path. */
  parse: (filePath: string) => ParsedCompose;
  /** Resolve a compose file's include tree into ComposeFile[]. */
  resolveIncludes: (entrypoint: string, baseDir: string) => ComposeFile[];
  /** Derive a human stack name for a compose file (honours its `name:`). */
  deriveName: (filePath: string, parsed: ParsedCompose) => string;
}

/**
 * A recognised on-disk compose layout. Implement this and register it in `./index.ts`
 * to support a new structure.
 */
export interface StackStructure {
  /** Stable identifier, e.g. "include-aggregator". */
  readonly id: string;
  /** Whether this structure recognises the candidate entrypoint. */
  matches(context: StructureContext): boolean;
  /** Expand the candidate into one or more stacks. */
  build(context: StructureContext): Stack[];
}

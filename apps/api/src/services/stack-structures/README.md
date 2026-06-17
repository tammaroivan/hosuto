# Stack structures

A **structure** teaches the scanner to recognise one on-disk compose layout and turn it
into `Stack`s. They are pluggable: adding support for a new layout is a new file here plus
one line in the registry — no changes to the scanner or matcher.

## How scanning works

`scanStacksDirectory` (in `../stack-scanner.ts`) discovers candidate compose files
(`docker-compose.yml`, `compose.yml`, …) up to two directories deep, then for each
top-level candidate asks the registry which structure handles it:

```
selectStructure(context).build(context)
```

Structures in [`index.ts`](./index.ts) are tried **in order**; the first whose `matches`
returns `true` wins. The last entry, `singleProjectStructure`, matches everything and is
the catch-all — so list specific structures before it.

## The interface

A structure implements [`StackStructure`](./types.ts):

| Member             | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `id`               | Stable identifier, e.g. `"include-aggregator"`.    |
| `matches(context)` | `true` if this structure recognises the candidate. |
| `build(context)`   | Expand the candidate into one or more `Stack`s.    |

`build` receives a [`StructureContext`](./types.ts) with everything injected (so the
structure stays pure and testable):

- `entrypoint` — absolute path of the candidate compose file
- `rootDir` — absolute path of the stacks directory
- `parsed` — the parsed entrypoint (`name`, `services`, `includes`, …)
- `parse(path)` — parse any compose file
- `resolveIncludes(entry, baseDir)` — a file's full include tree as `ComposeFile[]`
- `deriveName(path, parsed)` — a display name (honours `name:`, else derives from the filename/dir)

## Independent stacks vs. slices

The `Stack.serviceScope` field decides how containers match (in `../docker.ts`) and how
actions run (in `../../routes/stacks.ts`):

- **`serviceScope: null`** — an independent project. Containers match by compose project
  name; actions run against the stack's own `entrypoint`.
- **`serviceScope: string[]`** — a _slice_ of a larger shared project. All slices of that
  project share the root `entrypoint`; containers match by **service membership** (the
  project name is inferred from running containers, so an explicit `name:` is not
  required), and actions run against the root scoped to these services (a `down` becomes
  `rm -s -f <services>` so the shared project survives).

Emit slices only when the services genuinely belong to one Docker project (e.g. files
merged via `include:`). Otherwise emit independent stacks. Keep every service in exactly
one stack.

## Adding a structure

1. Create `my-structure.ts` here implementing `StackStructure`.
2. Register it in `index.ts`, **above** `singleProjectStructure`:
   ```ts
   export const structures: StackStructure[] = [
     myStructure,
     includeAggregatorStructure,
     singleProjectStructure,
   ];
   ```
3. Add tests: scanner behaviour in `../__tests__/stack-scanner.test.ts` (use the
   `writeFixture` helper) and, if it emits slices, matching behaviour in
   `../__tests__/docker.test.ts`.

### Skeleton

```ts
import type { Stack } from "@hosuto/shared";
import type { StackStructure, StructureContext } from "./types";

export const myStructure: StackStructure = {
  id: "my-structure",

  matches(context: StructureContext): boolean {
    // Inspect context.parsed / context.entrypoint to recognise the layout.
    return false;
  },

  build(context: StructureContext): Stack[] {
    const { entrypoint, rootDir, parse, resolveIncludes, deriveName } = context;
    // Build Stack objects. Set serviceScope: null for independent projects, or a
    // service list for slices that share a root entrypoint.
    return [];
  },
};
```

## Note on discovery

The scanner only discovers files named `docker-compose.yml`/`compose.yml`(`.yaml`). A
layout that hinges on other filenames (e.g. `docker-compose.<name>.yml` as standalone
stacks) also needs a change to discovery in `../stack-scanner.ts` — call it out in review.

# Hosuto

A file-first, lightweight Docker Compose management tool. Reads your existing compose files from disk, provides a clean web UI for management, and supports proper `include:` directives.

## Features

- **Stack discovery** — scans your stacks directory for compose files, resolves `include:` directives, and groups everything automatically
- **Stack creation** — create new stacks from the UI with a compose template
- **Live container status** — real-time updates via WebSocket, no polling
- **Stack & container actions** — Up, Down, Restart, Pull with streaming deploy output
- **Container shell** — interactive terminal into running containers
- **Volume visibility** — inspect container mounts from the detail page
- **File editor** — Monaco-based editor with directory tree, syntax highlighting, validation (`docker compose config`), and apply flow
- **File history** — automatic backups on save with version revert
- **Implicit .env detection** — discovers `.env` files next to compose files, matching Docker Compose's default behavior
- **Placeholder containers** — shows expected services from compose files even before they're created
- **Log viewer** — real-time log streaming with tail selection

## Supported Compose Patterns

Hosuto handles a variety of real-world Docker Compose layouts:

- Per-stack subdirectories (`stacks/web/compose.yml`)
- Monolith compose files with multiple services
- `include:` directives (nested and cross-directory)
- `extends:` with shared base files
- Shared root `.env` files alongside per-stack `.env`
- Override files (`compose.override.yml`)
- Nested directory structures (e.g., `group/stacks/web/compose.yml`)

## Development

```bash
bun install
bun run dev
```

- Web UI: http://localhost:5173
- API: http://localhost:3000

### Environment Variables

| Variable        | Default                | Description                             |
| --------------- | ---------------------- | --------------------------------------- |
| `STACKS_DIR`    | `/stacks`              | Directory containing your compose files |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Path to Docker socket                   |
| `PORT`          | `4678`                 | Server port (production)                |

### Commands

```bash
bun run dev          # Start dev servers (API :3000, Web :5173)
bun run build        # Build all packages
bun run typecheck    # Type-check all packages
bun run lint         # ESLint across all packages
bun run format       # Prettier write
bun run format:check # Prettier check (CI)
bun test             # Run tests
```

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono
- **Frontend**: React + Vite + TanStack Router + TanStack Query
- **Editor**: Monaco
- **Terminal**: xterm.js
- **Styling**: Tailwind CSS v4
- **Type safety**: Hono RPC
- **Monorepo**: Turborepo

## Project Structure

```
apps/
  api/                       Bun + Hono backend
    src/
      routes/                API route handlers
      services/              Business logic (scanner, parser, docker, exec, files)
  web/                       React + Vite frontend
    src/
      routes/                File-based routing (TanStack Router)
      components/            UI components (editor, terminal, tables)
      hooks/                 React hooks (queries, mutations, WebSocket)
      lib/                   Shared utilities (API client, formatters)
packages/
  shared/                    Shared types and constants
```

## License

[AGPL-3.0](LICENSE)

# Hosuto

A file-first, lightweight Docker Compose management tool. Reads your existing compose files from disk, provides a clean web UI for management, and supports proper `include:` directives.

## Tech Stack

- **Runtime**: Bun
- **Backend**: Hono
- **Frontend**: React + Vite + TanStack Router + TanStack Query
- **Styling**: Tailwind CSS
- **Shared types**: Hono RPC (zero codegen, end-to-end type safety)
- **Monorepo**: Turborepo

## Development

```bash
bun install
bun run dev
```

- Web UI: http://localhost:5173
- API: http://localhost:3000

## Project Structure

```
apps/
  api/             Bun + Hono backend
  web/             React + Vite frontend
packages/
  shared/          Shared types and constants
```

## License

[AGPL-3.0](LICENSE)

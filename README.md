<div align="center">
  <h1>Hosuto</h1>
  <p>Simple Docker Compose management, done right.</p>
  <p>
    <a href="#install">Install</a> &middot;
    <a href="#features">Features</a> &middot;
    <a href="#development">Development</a>
  </p>
</div>

---

Hosuto reads your existing compose files from disk, provides a clean web UI to manage them, and never touches or rewrites your YAML. Your files stay exactly as you wrote them.

Built for self-hosters who want a simple tool that works with their existing Docker Compose setup, not a platform that takes over their workflow.

## Install

```yaml
services:
  hosuto:
    image: hosuto:latest
    ports:
      - "4678:4678"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /path/to/your/stacks:/stacks
      - hosuto-data:/data
    restart: unless-stopped

volumes:
  hosuto-data:
```

```bash
docker compose up -d
```

Open `http://your-server:4678`

## Features

**Stack Management**

- Auto-discovers compose files from your stacks directory
- Full `include:` directive support
- Up, Down, Restart, Pull, Build with real-time streaming output
- Image update detection with one-click update (pull + recreate)
- Background update checker on a configurable schedule

**File Editor**

- Monaco editor with YAML syntax highlighting
- Edit any file in your stack: compose files, `.env`, configs
- Validate with `docker compose config` before applying
- Implicit `.env` detection matching Docker Compose behavior

**Live Monitoring**

- Real-time container status via WebSocket
- Log streaming with tail selection
- Interactive container terminal (shell access)

**Search & Filter**

- Search stacks by name, container, or image
- Filter by status: running, partial, stopped
- Keyboard shortcut: `Cmd+K` to focus search

**Designed for Simplicity**

- Files on disk are the source of truth. Hosuto never caches or rewrites your compose files
- Single container, single port. No agents, no databases, no complexity
- Settings page for update check interval configuration

## Supported Compose Patterns

Hosuto handles real-world Docker Compose layouts:

- Per-stack subdirectories (`stacks/web/compose.yml`)
- Monolith compose files with multiple services
- `include:` directives (nested and cross-directory)
- `extends:` with shared base files
- Shared root `.env` files alongside per-stack `.env`
- Override files (`compose.override.yml`)
- `build:` directives with Build button in the UI
- Nested directory structures (configurable scan depth)

## Configuration

| Variable        | Default                | Description                             |
| --------------- | ---------------------- | --------------------------------------- |
| `STACKS_DIR`    | `/stacks`              | Directory containing your compose files |
| `DATA_DIR`      | `/data`                | Directory for Hosuto settings           |
| `DOCKER_SOCKET` | `/var/run/docker.sock` | Path to Docker socket                   |
| `PORT`          | `4678`                 | Server port                             |

## Development

```bash
bun install
bun run dev
```

Web UI at `http://localhost:5173`, API at `http://localhost:3000`.

```bash
bun run dev          # Start dev servers
bun run build        # Build all packages
bun run typecheck    # Type-check all packages
bun run lint         # ESLint
bun run format       # Prettier
bun test             # Run tests
```

### Tech Stack

Bun + Hono backend, React + Vite + TanStack Router frontend, Monaco editor, xterm.js terminal, Tailwind CSS v4, end-to-end type safety via Hono RPC, Turborepo monorepo.

## License

[AGPL-3.0](LICENSE)

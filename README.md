<div align="center">
  <h1>Hosuto</h1>
  <p>Simple Docker Compose management, done right.</p>
  <p>
    <a href="#install">Install</a> &middot;
    <a href="#features">Features</a> &middot;
    <a href="#development">Development</a> &middot;
    <a href="#releasing">Releasing</a>
  </p>
</div>

---

Hosuto reads your existing compose files from disk, provides a clean web UI to manage them, and never touches or rewrites your YAML. Your files stay exactly as you wrote them.

Built for self-hosters who want a simple tool that works with their existing Docker Compose setup, not a platform that takes over their workflow.

## Install

```yaml
services:
  hosuto:
    image: ghcr.io/tammaroivan/hosuto:latest
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

Images are published to the GitHub Container Registry. Use `:latest` for the newest stable release, or pin a version (`:0.1.0`, or `:0.1` to track patches) for reproducible deployments. Multi-arch images are built for `linux/amd64` and `linux/arm64`.

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

Every pull request runs lint, type-check, tests, and a Docker image build via GitHub Actions (`.github/workflows/ci.yml`). Run the same checks locally before pushing:

```bash
bun run lint && bun run typecheck && bun test
```

### Tech Stack

Bun + Hono backend, React + Vite + TanStack Router frontend, Monaco editor, xterm.js terminal, Tailwind CSS v4, end-to-end type safety via Hono RPC, Turborepo monorepo.

## Releasing

Releases are driven by Git tags. Pushing a tag matching `v*` triggers `.github/workflows/release.yml`, which re-runs the checks, then builds and pushes a multi-arch image to `ghcr.io/tammaroivan/hosuto` and creates a GitHub Release with auto-generated notes.

```bash
git switch main && git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

The tag becomes the image version and is reported at `/api/health`. A single tag publishes several image tags:

| Image tag       | Points to                       |
| --------------- | ------------------------------- |
| `:0.1.0`        | This exact release              |
| `:0.1`          | Latest patch on the `0.1` line  |
| `:latest`       | Newest stable release           |
| `:sha-<commit>` | The exact commit, for debugging |

Versioning follows [semver](https://semver.org): patch (`v0.1.1`) for fixes, minor (`v0.2.0`) for backward-compatible features, major (`v1.0.0`) for breaking changes.

**Prereleases** — tags containing a hyphen (e.g. `v0.2.0-rc.1`) publish the versioned and `sha` image tags but do **not** move `:latest`, so they can be tested without affecting stable users.

## License

[AGPL-3.0](LICENSE)

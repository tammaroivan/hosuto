# Pinned tags for reproducible release builds. Bump deliberately.
FROM oven/bun:1.3.11 AS build
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN bun run build

FROM oven/bun:1.3.11-slim
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*
COPY --from=docker:28-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker/buildx-bin:0.21.0 /buildx /usr/local/lib/docker/cli-plugins/docker-buildx
COPY --from=docker/compose-bin:v2.33.1 /docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/web/dist ./public
RUN mkdir -p /data /stacks

# Injected at build time from the release tag; surfaced on /api/health.
ARG VERSION=dev
ENV APP_VERSION=$VERSION
ENV NODE_ENV=production
ENV PORT=4678
ENV STACKS_DIR=/stacks
ENV DATA_DIR=/data
EXPOSE 4678

LABEL org.opencontainers.image.title="Hosuto" \
      org.opencontainers.image.description="File-first, lightweight Docker Compose management with a web UI." \
      org.opencontainers.image.source="https://github.com/tammaroivan/hosuto" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.version="$VERSION"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD bun -e "fetch('http://localhost:4678/api/health').then(r => process.exit(r.ok ? 0 : 1))"

ENTRYPOINT ["bun", "run", "dist/index.js"]

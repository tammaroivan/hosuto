FROM oven/bun:1 AS build
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

FROM oven/bun:1-slim
COPY --from=docker:cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker/compose-bin /docker-compose /usr/local/lib/docker/cli-plugins/docker-compose
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/web/dist ./public
RUN mkdir -p /data /stacks

ENV NODE_ENV=production
ENV PORT=4678
ENV STACKS_DIR=/stacks
ENV DATA_DIR=/data
EXPOSE 4678

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD bun -e "fetch('http://localhost:4678/api/health').then(r => process.exit(r.ok ? 0 : 1))"

ENTRYPOINT ["bun", "run", "dist/index.js"]

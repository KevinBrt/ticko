# syntax=docker/dockerfile:1
#
# Ticko production image: one container serving the API and the compiled web app.
# Build from the repository root:  docker build -f docker/Dockerfile -t ticko .
#
# Base images are pinned by digest; Dependabot proposes updates.
ARG NODE_IMAGE=node:24.22.0-trixie-slim@sha256:7f486cabe892bff8fef04c0f7da8dba84a560be3e4e2740b7a86afc57ebec315
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs24-debian13:nonroot@sha256:c1326ce1aad4b976dce3a3da8b7eb5c8328e635e312309a7a0e5319d1470be0d

# ---------------------------------------------------------------------------------------------
# Keep only the package manifests needed by the server and the web app, so the dependency
# layers below are cached until a package.json or the lockfile changes.
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS prune
WORKDIR /src
RUN npm install --global --ignore-scripts turbo@2.11.9
COPY . .
RUN turbo prune @ticko/server @ticko/web --docker --out-dir /out/all \
 && turbo prune @ticko/server --docker --out-dir /out/server

# ---------------------------------------------------------------------------------------------
# Build JavaScript once, on the build machine's architecture: the output is platform-independent.
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS build
WORKDIR /src
ENV CI=true
COPY .npmrc ./
COPY --from=prune /out/all/json/ ./
RUN npm ci
COPY --from=prune /out/all/full/ ./
# Root files that `turbo prune` does not carry over.
COPY tsconfig.base.json ./
RUN npx turbo run build --filter=@ticko/server --filter=@ticko/web \
 && mkdir -p /data-skeleton

# ---------------------------------------------------------------------------------------------
# Production dependencies of the server, installed for the target architecture.
FROM ${NODE_IMAGE} AS runtime-deps
WORKDIR /src
ENV CI=true
COPY .npmrc ./
COPY --from=prune /out/server/json/ ./
RUN npm ci --omit=dev \
 # Workspace packages are bundled into the server; their symlinks would dangle.
 && rm -rf node_modules/@ticko \
 # npm may keep some server dependencies next to the server instead of hoisting them.
 && mkdir -p apps/server/node_modules

# ---------------------------------------------------------------------------------------------
# Runtime: distroless (no shell, no package manager), non-root user 65532.
FROM ${RUNTIME_IMAGE} AS runtime
ARG VERSION=dev
LABEL org.opencontainers.image.title="Ticko" \
      org.opencontainers.image.description="Modern issue tracking. Self-hosted. Free forever." \
      org.opencontainers.image.source="https://github.com/KevinBrt/ticko" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.version="${VERSION}"

WORKDIR /app
ENV NODE_ENV=production
COPY --from=runtime-deps /src/node_modules ./node_modules
COPY --from=runtime-deps /src/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /src/apps/server/dist ./apps/server/dist
COPY --from=build /src/apps/web/dist ./apps/web/dist
COPY --from=build /src/packages/db/migrations ./packages/db/migrations
COPY --from=build --chown=65532:65532 /data-skeleton /data

USER 65532:65532
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["/nodejs/bin/node", "/app/apps/server/dist/healthcheck.js"]
CMD ["--enable-source-maps", "/app/apps/server/dist/main.js"]

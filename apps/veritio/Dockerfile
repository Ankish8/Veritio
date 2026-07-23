FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Pin iii engine v0.21.6 (keep in sync with apps/veritio/scripts/install-iii.sh).
# The engine spawns its built-in registry workers via the iii-worker binary,
# so both must be on PATH.
ARG III_VERSION=0.21.6
RUN curl -fsSL "https://github.com/iii-hq/iii/releases/download/iii%2Fv${III_VERSION}/iii-x86_64-unknown-linux-gnu.tar.gz" | tar xz -C /usr/local/bin && \
    curl -fsSL "https://github.com/iii-hq/iii/releases/download/iii%2Fv${III_VERSION}/iii-worker-x86_64-unknown-linux-gnu.tar.gz" | tar xz -C /usr/local/bin && \
    /usr/local/bin/iii --version

FROM oven/bun:1.3-slim

# curl for health checks (envsubst no longer needed — the engine natively
# expands ${VAR:default} in config.yaml)
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy iii engine + worker runtime from builder
COPY --from=builder /usr/local/bin/iii /usr/local/bin/iii
COPY --from=builder /usr/local/bin/iii-worker /usr/local/bin/iii-worker

# Copy monorepo root files needed for bun install
COPY package.json bun.lock .npmrc ./
COPY apps/veritio/package.json apps/veritio/package.json
COPY packages/@veritio/core/package.json packages/@veritio/core/package.json
COPY packages/@veritio/ui/package.json packages/@veritio/ui/package.json
COPY packages/@veritio/auth/package.json packages/@veritio/auth/package.json
COPY packages/@veritio/swr-config/package.json packages/@veritio/swr-config/package.json
COPY packages/@veritio/study-types/package.json packages/@veritio/study-types/package.json
COPY packages/@veritio/dashboard-common/package.json packages/@veritio/dashboard-common/package.json
COPY packages/@veritio/study-flow/package.json packages/@veritio/study-flow/package.json
COPY packages/@veritio/card-sort/package.json packages/@veritio/card-sort/package.json
COPY packages/@veritio/prototype-test/package.json packages/@veritio/prototype-test/package.json
COPY packages/@veritio/analysis-shared/package.json packages/@veritio/analysis-shared/package.json
COPY packages/@veritio/yjs/package.json packages/@veritio/yjs/package.json
COPY apps/veritio/scripts/yjs-server/package.json apps/veritio/scripts/yjs-server/package.json
COPY workers/package.json workers/package.json
COPY workers/package-lock.json workers/package-lock.json

# Install all deps (needed for the backend bundle + runtime)
RUN bun install

# Copy entire monorepo (the bundle resolves shared @veritio/* packages)
COPY . .

# Bundle the backend: generate step index + esbuild → dist/backend.mjs
WORKDIR /app/apps/veritio
RUN bun run generate:steps && bun run build:backend

# Expose ports: REST API (4000) and browser stream WS / RBAC listener (4004).
# The trusted worker bridge (49134) binds 127.0.0.1 and must NEVER be exposed.
EXPOSE 4000
EXPOSE 4004

ENV NODE_ENV=production

# Railway volume mounts at /app/apps/veritio/data (builtin queue store) so
# queued jobs survive deploys.
CMD ["./start.sh"]

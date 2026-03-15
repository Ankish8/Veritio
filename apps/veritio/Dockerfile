FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Pin iii v0.7.0 — install.iii.dev is down (404) and v0.8.0 dropped x86_64 linux builds
RUN curl -fsSL https://github.com/iii-hq/iii/releases/download/iii%2Fv0.7.0/iii-x86_64-unknown-linux-gnu.tar.gz | tar xz -C /usr/local/bin

FROM oven/bun:1.3-slim

# Install runtime utilities: envsubst (config substitution) + curl (health checks)
RUN apt-get update && apt-get install -y --no-install-recommends gettext-base curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy iii engine from builder
COPY --from=builder /usr/local/bin/iii /usr/local/bin/iii

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

# Install all deps (needed for motia build + runtime)
RUN bun install --frozen-lockfile

# Copy entire monorepo (needed for motia build which resolves shared packages)
COPY . .

# Build motia steps
WORKDIR /app/apps/veritio
RUN bun run --bun motia-iii build

# Expose ports: REST API and Stream WebSocket
EXPOSE 4000
EXPOSE 4004

# Start via script that substitutes env vars in config.yaml then runs iii
CMD ["./start.sh"]

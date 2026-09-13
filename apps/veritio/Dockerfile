FROM debian:bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Pin iii engine v0.23.0 (keep in sync with apps/veritio/scripts/install-iii.sh).
# The engine spawns its built-in registry workers via the iii-worker binary,
# so both must be on PATH.
ARG III_VERSION=0.23.0
ARG TARGETARCH
RUN case "${TARGETARCH}" in \
      amd64) III_TRIPLE="x86_64-unknown-linux-gnu"; III_SHA="213e4bcfd413b50e8d97316fdadb4d78f0919436d3e64e4051d56fc8ff41decb"; III_WORKER_SHA="b77eab8e65c4a642ab9202456ed55c032c8e98a10b42222c6e7be894782fe8af" ;; \
      arm64) III_TRIPLE="aarch64-unknown-linux-gnu"; III_SHA="461508b43b9be9df5477a45ca0adce12327c2330eedf887dfe31ce0a80f043eb"; III_WORKER_SHA="493652be0368017772e47b39389551e72a37cc19f0e9a867060ab769555bb594" ;; \
      *) echo "Unsupported container architecture: ${TARGETARCH}" >&2; exit 1 ;; \
    esac && \
    curl -fsSL "https://github.com/iii-hq/iii/releases/download/iii%2Fv${III_VERSION}/iii-${III_TRIPLE}.tar.gz" -o /tmp/iii.tar.gz && \
    echo "${III_SHA}  /tmp/iii.tar.gz" | sha256sum -c - && \
    curl -fsSL "https://github.com/iii-hq/iii/releases/download/iii%2Fv${III_VERSION}/iii-worker-${III_TRIPLE}.tar.gz" -o /tmp/iii-worker.tar.gz && \
    echo "${III_WORKER_SHA}  /tmp/iii-worker.tar.gz" | sha256sum -c - && \
    tar xzf /tmp/iii.tar.gz -C /usr/local/bin && \
    tar xzf /tmp/iii-worker.tar.gz -C /usr/local/bin && \
    /usr/local/bin/iii --version

FROM oven/bun:1.3-slim

# curl for health checks.
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy iii engine + worker runtime from builder
COPY --from=builder /usr/local/bin/iii /usr/local/bin/iii
COPY --from=builder /usr/local/bin/iii-worker /usr/local/bin/iii-worker

# Copy monorepo root files needed for bun install
COPY package.json bun.lock .npmrc ./
COPY apps/docs/package.json apps/docs/package.json
COPY apps/landing/package.json apps/landing/package.json
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
RUN bun install --frozen-lockfile

# Copy entire monorepo (the bundle resolves shared @veritio/* packages)
COPY . .

# Resolve and cache the exact registry worker packages during the image build.
# Production startup therefore does not depend on the registry being reachable.
WORKDIR /app/apps/veritio
RUN iii compose build --file worker-compose.yaml

# Bundle the backend: generate step index + esbuild → dist/backend.mjs
RUN bun run generate:steps && bun run build:backend

# Expose ports: REST API (4000) and browser stream WS / RBAC listener (4004).
# The trusted worker bridge (49134) binds 127.0.0.1 and must NEVER be exposed.
EXPOSE 4000
EXPOSE 4004

ENV NODE_ENV=production

# Railway volume mounts at /app/apps/veritio/data (builtin queue store) so
# queued jobs survive deploys.
CMD ["./start.sh"]

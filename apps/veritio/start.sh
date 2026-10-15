#!/bin/bash
# Production startup: iii engine (v0.23.x) + registry workers + bundled
# backend, one container.
#
# The iii worker registry (api.workers.iii.dev) is never contacted at runtime.
# `iii compose --up` resolves every package:// worker against it on every
# start and rolls everything back if one resolve fails, so a registry outage
# took production down (2026-10-15). Instead:
#
# 1. Derive an engine-only compose file and each worker's configuration from
#    worker-compose.yaml (scripts/iii-standalone-workers.ts)
# 2. Start the engine with iii Compose and wait for the trusted worker
#    listener on :49134
# 3. Launch the http/queue/state/cron worker binaries installed at build time
#    (scripts/install-iii-workers.sh) and wait for them to register
# 4. Start the bundled backend (dist/backend.mjs registers all step
#    functions/triggers over :49134)
#
# If any of these processes exits, the container exits so Railway restarts it.
set -e

III_WORKERS_DIR="${III_WORKERS_DIR:-.iii/workers}"
STANDALONE_COMPOSE="worker-compose.standalone.yaml"

if ! WORKER_LAUNCHES="$(bun scripts/iii-standalone-workers.ts worker-compose.yaml "$III_WORKERS_DIR" "$STANDALONE_COMPOSE")"; then
  echo "FATAL: could not prepare the iii workers (run scripts/install-iii-workers.sh?)"
  exit 1
fi

WORKER_PIDS=()
cleanup() {
  echo "Shutting down..."
  kill ${APP_PID:-} "${WORKER_PIDS[@]}" ${III_COMPOSE_PID:-} 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

echo "Starting iii engine (PORT=${PORT:-4000})..."
iii compose --namespace default --up --file "$STANDALONE_COMPOSE" &
III_COMPOSE_PID=$!

# Wait for the trusted worker listener (TCP check — the WS port does not
# answer plain HTTP)
echo "Waiting for iii engine (ws://localhost:49134)..."
ATTEMPTS=0
while [ $ATTEMPTS -lt 30 ]; do
  if ! kill -0 $III_COMPOSE_PID 2>/dev/null; then
    echo "FATAL: iii Compose exited during startup"
    exit 1
  fi
  if (exec 3<>/dev/tcp/127.0.0.1/49134) 2>/dev/null; then
    exec 3>&- 3<&-
    echo "iii engine is ready"
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  sleep 1
done

if [ $ATTEMPTS -ge 30 ]; then
  echo "FATAL: iii engine readiness check timed out after 30s"
  exit 1
fi

# The environment iii Compose gives a worker it supervises.
WORKER_NAMES=()
while IFS=$'\t' read -r WORKER_NAME CONFIG_NAME WORKER_BIN; do
  [ -z "$WORKER_NAME" ] && continue
  echo "Starting iii worker $WORKER_NAME ($WORKER_BIN)..."
  III_URL="ws://127.0.0.1:49134" III_NAMESPACE=default \
    III_WORKER_NAME="$WORKER_NAME" III_CONFIG_NAME="$CONFIG_NAME" \
    "$WORKER_BIN" &
  WORKER_PIDS+=($!)
  WORKER_NAMES+=("$WORKER_NAME")
done <<< "$WORKER_LAUNCHES"

# Ready once every worker has connected and registered with the engine.
workers_registered() {
  WORKERS_JSON="$(iii trigger -n default engine::workers::list 2>/dev/null || true)"
  WORKERS_JSON="$WORKERS_JSON" bun -e '
    try {
      const body = JSON.parse(process.env.WORKERS_JSON || "{}");
      const names = new Set((body.workers || body || []).map((w) => w.name));
      process.exit(process.argv.slice(1).every((n) => names.has(n)) ? 0 : 1);
    } catch { process.exit(1); }
  ' "${WORKER_NAMES[@]}"
}

WORKER_READY_TIMEOUT="${III_WORKER_READY_TIMEOUT:-60}"
echo "Waiting for iii workers ${WORKER_NAMES[*]} (up to ${WORKER_READY_TIMEOUT}s)..."
ATTEMPTS=0
while ! workers_registered; do
  for PID in "${WORKER_PIDS[@]}"; do
    if ! kill -0 "$PID" 2>/dev/null; then
      echo "FATAL: an iii worker exited during startup"
      exit 1
    fi
  done
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge "$WORKER_READY_TIMEOUT" ]; then
    echo "FATAL: iii workers were not ready after ${WORKER_READY_TIMEOUT}s"
    iii trigger -n default engine::workers::list || true
    exit 1
  fi
  sleep 1
done
echo "iii workers are ready"

echo "Starting backend (dist/backend.mjs)..."
III_URL="ws://localhost:49134" bun dist/backend.mjs &
APP_PID=$!

echo "iii Compose PID: $III_COMPOSE_PID, worker PIDs: ${WORKER_PIDS[*]}, App PID: $APP_PID"

# Preserve the child exit status: hiding a crash as exit 0 makes Railway mark
# a dead deployment successful. Any long-running child exiting is unhealthy.
set +e
wait -n $III_COMPOSE_PID "${WORKER_PIDS[@]}" $APP_PID 2>/dev/null
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -eq 0 ]; then
  EXIT_CODE=1
fi

echo "A process exited with code $EXIT_CODE, shutting down"
exit $EXIT_CODE

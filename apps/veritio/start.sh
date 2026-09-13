#!/bin/bash
# Production startup: iii Compose (v0.23.x) + bundled backend, one container.
#
# 1. Start the managed topology from worker-compose.yaml (engine + HTTP,
#    queue, state, cron and stream workers)
# 2. Wait for the trusted worker listener on :49134
# 3. Wait for the trusted worker listener, then start the bundled backend
#    (dist/backend.mjs registers all step functions/triggers over :49134)
set -e

echo "Starting iii Compose topology (PORT=${PORT:-4000})..."
iii compose --namespace default --up --file worker-compose.yaml &
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

compose_worker_state() {
  STATUS_JSON="$(iii trigger -n default compose::status file=worker-compose.yaml 2>/dev/null || true)"
  COMPOSE_STATUS_JSON="$STATUS_JSON" bun -e '
    try {
      const containers = JSON.parse(process.env.COMPOSE_STATUS_JSON || "{}").containers || [];
      if (containers.some((item) => item.state === "failed")) console.log("failed");
      else if (containers.length === 4 && containers.every((item) => item.state === "ready")) console.log("ready");
      else console.log("waiting");
    } catch { console.log("waiting"); }
  '
}

echo "Waiting for iii project workers..."
ATTEMPTS=0
while [ $ATTEMPTS -lt 30 ]; do
  WORKER_STATE="$(compose_worker_state)"
  if [ "$WORKER_STATE" = "ready" ]; then
    echo "iii project workers are ready"
    break
  fi
  if [ "$WORKER_STATE" = "failed" ]; then
    echo "FATAL: one or more iii project workers failed during startup"
    iii compose logs --file worker-compose.yaml --tail 40 || true
    exit 1
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  sleep 1
done

if [ $ATTEMPTS -ge 30 ]; then
  echo "FATAL: iii project workers were not ready after 30s"
  iii trigger -n default compose::status file=worker-compose.yaml || true
  exit 1
fi

echo "Starting backend (dist/backend.mjs)..."
III_URL="ws://localhost:49134" bun dist/backend.mjs &
APP_PID=$!

monitor_compose_workers() {
  while true; do
    sleep 10
    if [ "$(compose_worker_state)" = "failed" ]; then
      echo "FATAL: an iii project worker exited after startup"
      kill -TERM $$
      return
    fi
  done
}
monitor_compose_workers &
COMPOSE_MONITOR_PID=$!

echo "iii Compose PID: $III_COMPOSE_PID, App PID: $APP_PID"

# Handle shutdown — if either process dies, stop the container so the
# platform (Railway) restarts it whole. Preserve the child exit status: hiding
# a startup crash as exit 0 makes Railway mark a dead deployment successful.
cleanup() {
  echo "Shutting down..."
  kill $APP_PID 2>/dev/null || true
  kill $III_COMPOSE_PID 2>/dev/null || true
  kill $COMPOSE_MONITOR_PID 2>/dev/null || true
  wait $APP_PID 2>/dev/null || true
  wait $III_COMPOSE_PID 2>/dev/null || true
  wait $COMPOSE_MONITOR_PID 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

set +e
wait -n $III_COMPOSE_PID $APP_PID 2>/dev/null
EXIT_CODE=$?
set -e

# Either long-running child exiting cleanly is still an unhealthy container.
if [ $EXIT_CODE -eq 0 ]; then
  EXIT_CODE=1
fi

echo "A process exited with code $EXIT_CODE, shutting down"
exit $EXIT_CODE

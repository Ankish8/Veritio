#!/bin/bash
# Production startup: iii engine (v0.23.x) + bundled backend, one container.
#
# 1. Re-seed the engine config store from the committed config.yaml
#    (the engine expands ${VAR:default} placeholders at seed time, so wiping
#    ./config every boot is what makes env var changes take effect)
# 2. Start the iii engine (HTTP :4000, RBAC WS :4004, trusted bridge :49134)
# 3. Wait for the trusted worker listener, then start the bundled backend
#    (dist/backend.mjs registers all step functions/triggers over :49134)
set -e

echo "Seeding iii config store from config.yaml..."
rm -rf ./config
mkdir -p .iii
cp config.yaml .iii/config.runtime.yaml

echo "Starting iii engine (PORT=${PORT:-4000})..."
iii --config .iii/config.runtime.yaml --no-update-check &
III_PID=$!

# Wait for the trusted worker listener (TCP check — the WS port does not
# answer plain HTTP)
echo "Waiting for iii engine (ws://localhost:49134)..."
ATTEMPTS=0
while [ $ATTEMPTS -lt 30 ]; do
  if ! kill -0 $III_PID 2>/dev/null; then
    echo "FATAL: iii engine exited during startup"
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
  echo "WARNING: iii engine readiness check timed out after 30s, starting app anyway"
fi

echo "Starting backend (dist/backend.mjs)..."
III_URL="ws://localhost:49134" bun dist/backend.mjs &
APP_PID=$!

echo "iii PID: $III_PID, App PID: $APP_PID"

# Handle shutdown — if either process dies, stop the container so the
# platform (Railway) restarts it whole. Preserve the child exit status: hiding
# a startup crash as exit 0 makes Railway mark a dead deployment successful.
cleanup() {
  echo "Shutting down..."
  kill $APP_PID 2>/dev/null || true
  kill $III_PID 2>/dev/null || true
  wait $APP_PID 2>/dev/null || true
  wait $III_PID 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

set +e
wait -n $III_PID $APP_PID 2>/dev/null
EXIT_CODE=$?
set -e

# Either long-running child exiting cleanly is still an unhealthy container.
if [ $EXIT_CODE -eq 0 ]; then
  EXIT_CODE=1
fi

echo "A process exited with code $EXIT_CODE, shutting down"
exit $EXIT_CODE

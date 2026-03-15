#!/bin/bash
# Production startup script for iii engine + compiled Motia app on Railway
# 1. Substitutes env vars in config.yaml
# 2. Starts iii engine (HTTP server, queues, streams)
# 3. Waits for iii internal WebSocket to be ready
# 4. Starts compiled JS app (step handlers connect to iii via ws://localhost:49134)
set -e

# Set defaults for env vars (shell handles :- syntax, envsubst only handles ${VAR})
export PORT="${PORT:-4000}"
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export OTEL_ENABLED="${OTEL_ENABLED:-true}"
export OTEL_SERVICE_NAME="${OTEL_SERVICE_NAME:-veritio-api}"
export OTEL_EXPORTER_TYPE="${OTEL_EXPORTER_TYPE:-memory}"

# Substitute env vars in config.yaml
envsubst < config.yaml > config.runtime.yaml

echo "Starting iii engine on port $PORT..."

# Start iii engine in background
iii --config config.runtime.yaml &
III_PID=$!

# Wait for iii engine to be ready (internal WS on port 49134)
echo "Waiting for iii engine to be ready..."
ATTEMPTS=0
while [ $ATTEMPTS -lt 30 ]; do
  if kill -0 $III_PID 2>/dev/null && curl -sf http://localhost:49134/ >/dev/null 2>&1; then
    echo "iii engine is ready"
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  sleep 1
done

if [ $ATTEMPTS -ge 30 ]; then
  echo "WARNING: iii engine readiness check timed out after 30s, starting app anyway"
fi

# Start the compiled Motia app (connects to iii via ws://localhost:49134)
echo "Starting compiled Motia app..."
bun dist/index-production.js &
APP_PID=$!

echo "iii PID: $III_PID, App PID: $APP_PID"

# Handle shutdown
cleanup() {
  echo "Shutting down..."
  kill $APP_PID 2>/dev/null || true
  kill $III_PID 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

# Wait for either process to exit (bash supports wait -n)
wait -n $III_PID $APP_PID 2>/dev/null || true
EXIT_CODE=$?
echo "A process exited with code $EXIT_CODE, shutting down"
cleanup

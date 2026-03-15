#!/bin/bash
# Production start script for Railway
# Starts the iii engine + compiles steps + runs the compiled app
set -e

PORT="${PORT:-4000}"
echo "Starting production server on port $PORT..."

# Step 1: Build the compiled app (one-shot, not watch mode)
echo "Building step files..."
bun run --bun motia-iii build

# Step 2: Start the iii engine in background
echo "Starting iii engine..."
iii &
III_PID=$!

# Wait for iii engine to be ready (internal WebSocket on port 49134)
echo "Waiting for iii engine to start..."
ATTEMPTS=0
while ! curl -s http://localhost:$PORT/api/health > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge 30 ]; then
    echo "iii engine did not start in 30 seconds"
    break
  fi
  sleep 1
done

# Step 3: Run the compiled app (connects to iii via WebSocket)
echo "Starting compiled Motia app..."
bun dist/index-production.js &
APP_PID=$!

echo "iii engine PID: $III_PID, App PID: $APP_PID"

# Handle shutdown
cleanup() {
  echo "Shutting down..."
  kill $APP_PID 2>/dev/null || true
  kill $III_PID 2>/dev/null || true
  exit 0
}
trap cleanup EXIT INT TERM

# Wait for either process to exit
wait -n $III_PID $APP_PID 2>/dev/null
EXIT_CODE=$?
echo "Process exited with code $EXIT_CODE"
cleanup

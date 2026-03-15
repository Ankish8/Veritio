#!/bin/bash
# Development startup script
# Starts up to 4 development servers:
#   - Port 4000: Motia backend (API + events + cron)
#   - Port 4001: Next.js frontend (veritio app)
#   - Port 4002: Yjs WebSocket server (real-time collaboration)
#   - Port 4004: Stream WebSocket server (real-time streams)
#   - Composio trigger listener (if COMPOSIO_API_KEY is set)
# Ensures backend is ready before starting frontend servers
# Expected startup time: ~30-40 seconds for full initialization

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"

echo "🚀 Starting development servers..."
echo "📁 App directory: $APP_DIR"
echo "📁 Repo root: $REPO_ROOT"

# Function to check if port is in use — waits until port is actually free
check_and_cleanup_port() {
  local port=$1
  local service=$2

  if lsof -ti :$port > /dev/null 2>&1; then
    echo "⚠️  Port $port is already in use by $service"
    echo "🔧 Cleaning up existing processes on port $port..."
    lsof -ti :$port | xargs kill -9 2>/dev/null || true

    # Wait until port is actually released (up to 10 seconds)
    local attempts=0
    while lsof -ti :$port > /dev/null 2>&1; do
      attempts=$((attempts + 1))
      if [ $attempts -ge 20 ]; then
        echo "❌ Port $port still in use after 10 seconds. Force killing again..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
        break
      fi
      sleep 0.5
    done
    echo "✅ Port $port is now available"
  fi
}

# Ensure a port is free — kill anything on it and wait until released
ensure_port_free() {
  local port=$1
  local max_wait=$2  # seconds
  [ -z "$max_wait" ] && max_wait=10

  if ! lsof -ti :$port > /dev/null 2>&1; then
    return 0
  fi

  echo "🔧 Clearing port $port..."
  lsof -ti :$port | xargs kill -9 2>/dev/null || true

  local elapsed=0
  while lsof -ti :$port > /dev/null 2>&1; do
    elapsed=$((elapsed + 1))
    if [ $elapsed -ge $max_wait ]; then
      echo "❌ Port $port still occupied after ${max_wait}s — force killing again"
      lsof -ti :$port | xargs kill -9 2>/dev/null || true
      sleep 1
      if lsof -ti :$port > /dev/null 2>&1; then
        echo "❌ FATAL: Cannot free port $port"
        return 1
      fi
      break
    fi
    sleep 1
  done
  echo "✅ Port $port is free"
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# CRITICAL: Kill ALL stale motia/next processes from previous sessions FIRST.
# ─────────────────────────────────────────────────────────────────────────────
# When dev.sh is killed with kill -9 (or by the Claude Code task system), the
# trap doesn't fire and Motia child processes become orphans (PPID=1). These
# orphans hold ports and cause listenWithFallback to bump new Motia instances
# to the next available port (4001, 4002, etc).
echo "🧹 Killing stale processes from previous sessions..."
pkill -9 -f "motia-iii" 2>/dev/null || true
pkill -9 -f "motia dev" 2>/dev/null || true
pkill -9 -f "index-dev.js" 2>/dev/null || true
# Kill iii engine by port (pkill -f "iii" is too broad — matches motia-iii)
lsof -ti :49134 | xargs kill -9 2>/dev/null || true
pkill -9 -f "next dev -p 4001" 2>/dev/null || true
pkill -9 -f "yjs-server/server" 2>/dev/null || true
sleep 2

# Check and cleanup ports before starting
check_and_cleanup_port 4000 "backend"
check_and_cleanup_port 4001 "frontend"
check_and_cleanup_port 4002 "yjs"
# Port 4003 no longer used (landing page removed)
check_and_cleanup_port 4004 "stream-ws"

# Clean entire .next/ directory to prevent bloated Turbopack cache.
# The .next/ cache can grow to 2GB+ over time, causing Turbopack to serve
# JS chunks extremely slowly (stuck in "pending" for 10+ seconds). This makes
# the app appear broken — auth guard never resolves because client JS never loads.
# Additionally, hard kills (Ctrl+C, pkill) during RocksDB compaction leave
# orphaned SST files that crash Turbopack on next startup.
echo "🧹 Cleaning Next.js build cache..."
rm -rf "$APP_DIR/.next"

# Start backend with auto-restart on crash (EPIPE cascade recovery)
# Architecture (Motia v1 / iii engine):
#   1. iii engine   → starts HTTP server (port 4000) + WebSocket (port 49134)
#   2. motia-iii dev → compiles all step files to dist/index-dev.js
#   3. dist/index-dev.js → connects to iii engine via ws://localhost:49134
#
# The restart loop watches dist/index-dev.js. If it crashes, we rebuild and restart.
# The iii engine is started once and stays up for the session.
III_ENGINE_PID=""

start_iii_engine() {
  cd "$APP_DIR"
  ~/.local/bin/iii &
  III_ENGINE_PID=$!
  echo "   iii engine PID: $III_ENGINE_PID"
  # Wait for iii to bind on port 4000
  local attempts=0
  while ! lsof -ti :4000 > /dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ $attempts -ge 10 ]; then
      echo "❌ iii engine failed to start on port 4000"
      return 1
    fi
    sleep 1
  done
  echo "   iii engine ready on port 4000 and ws://localhost:49134"
  return 0
}

MOTIA_WATCHER_PID=""

start_motia_with_restart() {
  local max_restarts=10
  local restart_count=0
  local restart_window_start=$(date +%s)

  cd "$APP_DIR"

  # motia-iii dev is a long-running file watcher that rebuilds on changes.
  # Start it in background — it writes to dist/index-dev.js when files change.
  echo "🔨 Starting Motia file watcher (motia-iii dev)..."
  bun run --bun motia-iii dev &
  MOTIA_WATCHER_PID=$!

  # Wait for the initial build to produce dist/index-dev.js
  local build_wait=0
  while [ ! -f "$APP_DIR/dist/index-dev.js" ] || [ "$APP_DIR/dist/index-dev.js" -ot "$APP_DIR/src/steps" ]; do
    build_wait=$((build_wait + 1))
    if [ $build_wait -ge 30 ]; then
      echo "❌ Build timed out after 30 seconds"
      break
    fi
    sleep 1
  done
  # Extra second to ensure file is fully written
  sleep 1

  echo "✅ Initial build complete. Starting Motia app..."

  while true; do
    cd "$APP_DIR"

    # Run the compiled app — connects to iii engine via WebSocket
    bun --env-file="$APP_DIR/.env.local" dist/index-dev.js &
    MOTIA_INNER_PID=$!
    BACKEND_PID=$MOTIA_INNER_PID

    wait $MOTIA_INNER_PID 2>/dev/null
    EXIT_CODE=$?

    # If killed by our cleanup trap (SIGTERM=143, SIGINT=130), stop the loop
    if [ $EXIT_CODE -eq 143 ] || [ $EXIT_CODE -eq 130 ] || [ $EXIT_CODE -eq 0 ]; then
      break
    fi

    # Reset restart counter every 5 minutes of uptime
    local now=$(date +%s)
    if [ $((now - restart_window_start)) -gt 300 ]; then
      restart_count=0
      restart_window_start=$now
    fi

    restart_count=$((restart_count + 1))
    if [ $restart_count -gt $max_restarts ]; then
      echo "❌ Motia crashed $max_restarts times in 5 minutes. Giving up."
      break
    fi

    echo ""
    echo "⚠️  Motia app crashed (exit $EXIT_CODE). Restarting ($restart_count/$max_restarts)..."
    sleep 2
  done
}

echo "▶ Starting iii engine on port 4000..."
start_iii_engine
if [ $? -ne 0 ]; then
  echo "❌ iii engine failed to start. Aborting."
  exit 1
fi

echo "▶ Building and starting Motia app (with auto-restart)..."
start_motia_with_restart &
RESTART_LOOP_PID=$!
# Give a moment for the build + app to start
sleep 1
BACKEND_PID=$(pgrep -f "dist/index-dev.js" | head -1)
[ -z "$BACKEND_PID" ] && BACKEND_PID=$RESTART_LOOP_PID

echo "⏳ Waiting for Motia app to connect and register routes..."
sleep 15

# Wait for backend health check
echo "⏳ Checking if backend is ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  # Check if the restart loop is still running
  if ! kill -0 $RESTART_LOOP_PID 2>/dev/null; then
    echo "❌ Backend process died unexpectedly"
    echo "💡 Check logs at /tasks to see what went wrong"
    exit 1
  fi

  # Try health check endpoint (accept both 200 and 503 since backend is up)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
    echo "✅ Backend is ready! (HTTP $HTTP_CODE)"
    # Wait a bit more for services to stabilize
    sleep 1
    break
  fi

  # Show progress every 5 attempts
  if [ $((ATTEMPT % 5)) -eq 0 ] && [ $ATTEMPT -gt 0 ]; then
    echo "   Still waiting... (attempt $ATTEMPT/$MAX_ATTEMPTS, HTTP $HTTP_CODE)"
  fi

  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ Backend failed to start within 70 seconds (last HTTP code: $HTTP_CODE)"
    echo "💡 Check iii engine: ~/.local/bin/iii"
    echo "💡 Check app build: bun run --bun motia-iii dev && bun --env-file=.env.local dist/index-dev.js"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi

  sleep 2
done

# Ensure port 4001 is free before starting Next.js
if lsof -ti :4001 > /dev/null 2>&1; then
  echo "⚠️  Port 4001 occupied — clearing before starting Next.js..."
  ensure_port_free 4001 10
fi

# Start frontend
echo "▶ Starting Next.js frontend (veritio) on port 4001..."
cd "$APP_DIR"
bun run --bun next dev -p 4001 --hostname 0.0.0.0 &
FRONTEND_PID=$!

# Wait for Next.js to actually bind to port 4001
echo "⏳ Waiting for Next.js to start on port 4001..."
NEXT_ATTEMPTS=0
NEXT_MAX=15
while [ $NEXT_ATTEMPTS -lt $NEXT_MAX ]; do
  if lsof -ti :4001 > /dev/null 2>&1; then
    # Verify it's actually Next.js responding (not Motia workbench)
    NEXT_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/api/auth/ok 2>/dev/null || echo "000")
    if [ "$NEXT_CHECK" != "000" ]; then
      echo "✅ Next.js is running on port 4001"
      break
    fi
  fi
  NEXT_ATTEMPTS=$((NEXT_ATTEMPTS + 1))
  sleep 2
done

if [ $NEXT_ATTEMPTS -eq $NEXT_MAX ]; then
  echo "⚠️  Next.js may not have started properly on port 4001"
  echo "   Check if another process grabbed the port:"
  lsof -i :4001 | head -5
fi

# Start Yjs collaboration server
echo "▶ Starting Yjs WebSocket server on port 4002..."
cd "$APP_DIR"
bun --env-file="$APP_DIR/.env.local" run --watch scripts/yjs-server/server.ts &
YJS_PID=$!

# Landing page removed (separate repository)
LANDING_PID=""

# Start Composio trigger listener (dev-only, receives events via subscribe())
# Only starts if COMPOSIO_API_KEY is configured — other devs without Composio skip this.
COMPOSIO_PID=""
if grep -q "COMPOSIO_API_KEY" "$APP_DIR/.env.local" 2>/dev/null; then
  echo "▶ Starting Composio trigger listener..."
  # MUST use Node (npx tsx), not Bun — Bun's WebSocket implementation is
  # incompatible with pusher-js, causing triggers.subscribe() to silently
  # fail (Pusher state goes connecting → unavailable instead of connected).
  (cd "$APP_DIR" && export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/composio-listener.ts) &
  COMPOSIO_PID=$!
fi

# Cleanup function
cleanup() {
  echo ""
  echo "🛑 Shutting down development servers..."

  # Kill processes gracefully first
  if [ ! -z "$RESTART_LOOP_PID" ]; then
    echo "   Stopping backend restart loop (PID $RESTART_LOOP_PID)..."
    kill $RESTART_LOOP_PID 2>/dev/null || true
  fi

  if [ ! -z "$BACKEND_PID" ]; then
    echo "   Stopping backend (PID $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
  fi

  if [ ! -z "$FRONTEND_PID" ]; then
    echo "   Stopping frontend (PID $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
  fi

  if [ ! -z "$YJS_PID" ]; then
    echo "   Stopping Yjs server (PID $YJS_PID)..."
    kill $YJS_PID 2>/dev/null || true
  fi

  # Landing page removed (separate repository)

  if [ ! -z "$COMPOSIO_PID" ]; then
    echo "   Stopping Composio listener (PID $COMPOSIO_PID)..."
    kill $COMPOSIO_PID 2>/dev/null || true
  fi

  # Wait a moment for graceful shutdown
  sleep 1

  # Kill by process name to catch orphaned children
  pkill -9 -f "motia-iii" 2>/dev/null || true
  pkill -9 -f "motia dev" 2>/dev/null || true
  pkill -9 -f "index-dev.js" 2>/dev/null || true
  [ ! -z "$MOTIA_WATCHER_PID" ] && kill -9 $MOTIA_WATCHER_PID 2>/dev/null || true
  [ ! -z "$III_ENGINE_PID" ] && kill -9 $III_ENGINE_PID 2>/dev/null || true
  # Kill iii engine by port (not by name since "iii" matches too broadly)
  lsof -ti :49134 | xargs kill -9 2>/dev/null || true
  pkill -9 -f "next dev -p 4001" 2>/dev/null || true
  pkill -9 -f "yjs-server/server" 2>/dev/null || true

  # Extra cleanup to ensure ports are freed
  lsof -ti :4000 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti :4001 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti :4002 2>/dev/null | xargs kill -9 2>/dev/null || true
  # Port 4003 no longer used

  echo "✅ Cleanup complete"
  exit 0
}

# Set up cleanup trap for various exit signals
trap cleanup EXIT INT TERM

# Wait a moment for all servers to stabilize
sleep 2

# Verify all servers are actually running
BACKEND_STATUS="❌"
FRONTEND_STATUS="❌"
YJS_STATUS="❌"
COMPOSIO_STATUS=""

curl -s http://localhost:4000/api/health > /dev/null 2>&1 && BACKEND_STATUS="✅"
curl -s http://localhost:4001 > /dev/null 2>&1 && FRONTEND_STATUS="✅"
lsof -i :4002 | grep LISTEN > /dev/null 2>&1 && YJS_STATUS="✅"
if [ ! -z "$COMPOSIO_PID" ]; then
  kill -0 $COMPOSIO_PID 2>/dev/null && COMPOSIO_STATUS="✅" || COMPOSIO_STATUS="❌"
fi

# Display server URLs
SERVER_COUNT=3
[ ! -z "$COMPOSIO_PID" ] && SERVER_COUNT=4

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All $SERVER_COUNT servers are running:"
echo "  🔧 Backend (Motia):        http://localhost:4000 $BACKEND_STATUS (PID $BACKEND_PID)"
echo "  🌐 Frontend (Veritio):     http://localhost:4001 $FRONTEND_STATUS (PID $FRONTEND_PID)"
echo "  🔄 Yjs WebSocket:          ws://localhost:4002 $YJS_STATUS (PID $YJS_PID)"
if [ ! -z "$COMPOSIO_PID" ]; then
  echo "  🔗 Composio Listener:      (trigger subscriber) $COMPOSIO_STATUS (PID $COMPOSIO_PID)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo "   • Press Ctrl+C to stop all servers"
echo "   • Check server logs in the terminal output above"
echo "   • iii engine: HTTP port 4000, WebSocket port 49134"
echo ""

# Wait for all processes
wait

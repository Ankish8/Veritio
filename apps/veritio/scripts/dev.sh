#!/bin/bash
# Development startup script
# Starts up to 5 development servers:
#   - Port 4000: iii engine HTTP (all backend step routes)
#   - Port 4001: Next.js frontend (veritio app)
#   - Port 4002: Yjs WebSocket server (real-time collaboration)
#   - Port 4003: Next.js marketing/landing app (multi-zone source)
#   - Port 4004: iii RBAC WebSocket listener (browser stream clients)
#   - Port 4014: iii stream worker (internal)
#   - Port 49134: iii trusted worker bridge (backend connects here)
#   - Composio trigger listener (if COMPOSIO_API_KEY is set)
# Ensures backend is ready before starting frontend servers
# Expected startup time: ~20-30 seconds for full initialization

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
LANDING_APP_DIR="$REPO_ROOT/apps/landing"

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
# Kill ALL stale backend processes from previous sessions FIRST.
# ─────────────────────────────────────────────────────────────────────────────
# When dev.sh is killed with kill -9, the trap doesn't fire and children become
# orphans (PPID=1) holding ports.
echo "🧹 Killing stale processes from previous sessions..."
pkill -9 -f "src/backend/main.ts" 2>/dev/null || true
pkill -9 -f "generate-step-index" 2>/dev/null || true
pkill -9 -f "\.iii/bin/iii" 2>/dev/null || true
pkill -9 -f "iii-worker" 2>/dev/null || true
# Kill engine by its ports too (binary name "iii" is too broad for pkill)
lsof -ti :49134 2>/dev/null | xargs kill -9 2>/dev/null || true
pkill -9 -f "next dev -p 4001" 2>/dev/null || true
pkill -9 -f "next dev -p 4003" 2>/dev/null || true
pkill -9 -f "yjs-server/server" 2>/dev/null || true
sleep 2

# Check and cleanup ports before starting
check_and_cleanup_port 4000 "backend http"
check_and_cleanup_port 4001 "frontend"
check_and_cleanup_port 4002 "yjs"
check_and_cleanup_port 4003 "landing"
check_and_cleanup_port 4004 "stream-ws"
check_and_cleanup_port 4014 "stream-worker"

# Clean entire .next/ directory to prevent bloated Turbopack cache.
# The .next/ cache can grow to 2GB+ over time, causing Turbopack to serve
# JS chunks extremely slowly (stuck in "pending" for 10+ seconds).
echo "🧹 Cleaning Next.js build cache..."
rm -rf "$APP_DIR/.next"
rm -rf "$LANDING_APP_DIR/.next"

# ─────────────────────────────────────────────────────────────────────────────
# iii engine (v0.23.x, pinned via scripts/install-iii.sh)
# ─────────────────────────────────────────────────────────────────────────────
# The engine owns HTTP (4000), the browser stream listener (4004), the internal
# stream worker (4014), and the trusted worker bridge (49134). The backend app
# (src/backend/main.ts) connects to 49134 and registers all step routes.
III_COMPOSE_PID=""
III_COMPOSE_MONITOR_PID=""
III_BIN="$APP_DIR/.iii/bin/iii"

iii_compose_worker_state() {
  local status_json
  status_json="$(PATH="$APP_DIR/.iii/bin:$PATH" "$III_BIN" trigger -n default \
    compose::status file="$APP_DIR/worker-compose.yaml" 2>/dev/null || true)"
  COMPOSE_STATUS_JSON="$status_json" bun -e '
    try {
      const containers = JSON.parse(process.env.COMPOSE_STATUS_JSON || "{}").containers || [];
      if (containers.some((item) => item.state === "failed")) console.log("failed");
      else if (containers.length === 4 && containers.every((item) => item.state === "ready")) console.log("ready");
      else console.log("waiting");
    } catch { console.log("waiting"); }
  '
}

start_iii_compose() {
  cd "$APP_DIR"

  PATH="$APP_DIR/.iii/bin:$PATH" "$III_BIN" compose \
    --namespace default --up --file "$APP_DIR/worker-compose.yaml" &
  III_COMPOSE_PID=$!
  echo "   iii Compose PID: $III_COMPOSE_PID"
  # Wait for the engine to bind HTTP (4000) and the worker bridge (49134)
  local attempts=0
  while ! lsof -ti :4000 > /dev/null 2>&1 || ! lsof -ti :49134 > /dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ $attempts -ge 15 ]; then
      echo "❌ iii Compose failed to start (ports 4000/49134)"
      return 1
    fi
    sleep 1
  done

  attempts=0
  while [ $attempts -lt 30 ]; do
    local worker_state
    worker_state="$(iii_compose_worker_state)"
    if [ "$worker_state" = "ready" ]; then
      break
    fi
    if [ "$worker_state" = "failed" ]; then
      echo "❌ iii project worker failed during startup"
      PATH="$APP_DIR/.iii/bin:$PATH" "$III_BIN" compose logs \
        --file "$APP_DIR/worker-compose.yaml" --tail 40 || true
      return 1
    fi
    attempts=$((attempts + 1))
    sleep 1
  done
  if [ $attempts -ge 30 ]; then
    echo "❌ iii project workers were not ready after 30 seconds"
    return 1
  fi
  echo "   iii engine ready on :4000 (http), :4004 (stream ws), ws://localhost:49134 (bridge)"
  return 0
}

monitor_iii_compose() {
  while true; do
    sleep 2

    if lsof -ti :4000 > /dev/null 2>&1 && \
       lsof -ti :49134 > /dev/null 2>&1 && \
       [ "$(iii_compose_worker_state)" != "failed" ]; then
      continue
    fi

    echo ""
    echo "⚠️  iii Compose stopped. Restarting..."
    [ ! -z "$III_COMPOSE_PID" ] && kill -9 $III_COMPOSE_PID 2>/dev/null || true
    lsof -ti :4000 2>/dev/null | xargs kill -9 2>/dev/null || true
    lsof -ti :49134 2>/dev/null | xargs kill -9 2>/dev/null || true

    start_iii_compose || sleep 2
  done
}

echo "▶ Ensuring pinned iii binaries (scripts/install-iii.sh)..."
"$SCRIPT_DIR/install-iii.sh" || { echo "❌ iii install failed"; exit 1; }

echo "▶ Starting iii Compose topology..."
start_iii_compose
if [ $? -ne 0 ]; then
  echo "❌ iii Compose failed to start. Aborting."
  exit 1
fi
monitor_iii_compose &
III_COMPOSE_MONITOR_PID=$!

# ─────────────────────────────────────────────────────────────────────────────
# Backend app (all steps) — bun --watch restarts on code changes; the index
# watcher regenerates the import list when step files are added/removed.
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Generating step index..."
cd "$APP_DIR"
bun scripts/generate-step-index.ts

echo "▶ Starting step index watcher..."
bun scripts/generate-step-index.ts --watch &
INDEX_WATCHER_PID=$!

start_backend_app() {
  cd "$APP_DIR"
  III_URL="ws://localhost:49134" bun --env-file="$APP_DIR/.env.local" --watch src/backend/main.ts &
  BACKEND_PID=$!
  echo "   backend app PID: $BACKEND_PID"
}

# ─────────────────────────────────────────────────────────────────────────────
# Backend route monitor — recovers the "process alive, routes gone" wedge.
# When a `bun --watch` reload fails to resolve an import (e.g. a step imports a
# module that hasn't been created yet), bun never builds a dependency graph, so
# the watcher stops reacting to further edits — including the one that adds the
# missing file. The supervisor process stays alive, so nothing looks wrong, but
# no steps are registered and every /api/* route 404s until a manual restart.
# Poll health and respawn the app when that happens.
# ─────────────────────────────────────────────────────────────────────────────
BACKEND_MONITOR_PID=""

monitor_backend_routes() {
  local misses=0
  while true; do
    sleep 5

    # Only judge app health while the engine is up — the engine monitor owns
    # engine restarts, and health is expected to fail while that's in flight.
    lsof -ti :4000 > /dev/null 2>&1 || continue
    lsof -ti :49134 > /dev/null 2>&1 || continue

    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 \
      http://localhost:4000/api/health 2>/dev/null || echo "000")

    # 200 healthy, 503 degraded — both mean the routes are registered.
    if [ "$code" = "200" ] || [ "$code" = "503" ]; then
      misses=0
      continue
    fi

    misses=$((misses + 1))
    # Ride out transient blips and engine restarts before acting.
    [ $misses -lt 3 ] && continue

    echo ""
    echo "⚠️  Backend routes unavailable (HTTP $code, ${misses} checks) — restarting backend app..."
    pkill -9 -f "src/backend/main.ts" 2>/dev/null || true
    sleep 1
    bun scripts/generate-step-index.ts > /dev/null 2>&1 || true
    start_backend_app
    misses=0
  done
}

echo "▶ Starting backend app (bun --watch src/backend/main.ts)..."
start_backend_app

# Wait for backend health check
echo "⏳ Checking if backend is ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend process died unexpectedly"
    echo "💡 Check logs above (step registration failures crash the boot on purpose)"
    exit 1
  fi

  # Health endpoint returns 200 (healthy) or 503 (degraded) once routes exist
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
    echo "✅ Backend is ready! (HTTP $HTTP_CODE)"
    sleep 1
    break
  fi

  if [ $((ATTEMPT % 5)) -eq 0 ] && [ $ATTEMPT -gt 0 ]; then
    echo "   Still waiting... (attempt $ATTEMPT/$MAX_ATTEMPTS, HTTP $HTTP_CODE)"
  fi

  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo "❌ Backend failed to start within 60 seconds (last HTTP code: $HTTP_CODE)"
    echo "💡 Engine: $III_BIN compose --namespace default --up --file worker-compose.yaml"
    echo "💡 App: III_URL=ws://localhost:49134 bun --watch src/backend/main.ts"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi

  sleep 2
done

# Watch for the routes disappearing out from under a wedged --watch reload.
monitor_backend_routes &
BACKEND_MONITOR_PID=$!

# Ensure port 4003 is free before starting the landing app
if lsof -ti :4003 > /dev/null 2>&1; then
  echo "⚠️  Port 4003 occupied — clearing before starting the landing app..."
  ensure_port_free 4003 10
fi

# Start the local landing app before the main app begins proxying to it.
echo "▶ Starting Next.js landing app on port 4003..."
cd "$LANDING_APP_DIR"
bun run --bun next dev -p 4003 --hostname 0.0.0.0 &
LANDING_PID=$!

echo "⏳ Waiting for the landing app to start on port 4003..."
LANDING_ATTEMPTS=0
LANDING_MAX=15
while [ $LANDING_ATTEMPTS -lt $LANDING_MAX ]; do
  if lsof -ti :4003 > /dev/null 2>&1; then
    LANDING_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4003/ 2>/dev/null || echo "000")
    if [ "$LANDING_CHECK" != "000" ]; then
      echo "✅ Landing app is running on port 4003"
      break
    fi
  fi
  LANDING_ATTEMPTS=$((LANDING_ATTEMPTS + 1))
  sleep 2
done

if [ $LANDING_ATTEMPTS -eq $LANDING_MAX ]; then
  echo "⚠️  Landing app may not have started properly on port 4003"
  echo "   Check if another process grabbed the port:"
  lsof -i :4003 | head -5
fi

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

# Start Composio trigger listener (dev-only, receives events via subscribe())
# Only starts if COMPOSIO_API_KEY is configured — other devs without Composio skip this.
COMPOSIO_PID=""
if node --env-file="$APP_DIR/.env.local" -e \
  'process.exit(process.env.COMPOSIO_API_KEY?.trim() ? 0 : 1)' 2>/dev/null; then
  echo "▶ Starting Composio trigger listener..."
  # MUST use Node, not Bun — Bun's WebSocket implementation is
  # incompatible with pusher-js, causing triggers.subscribe() to silently
  # fail (Pusher state goes connecting → unavailable instead of connected).
  # Node's native --env-file parser safely handles quoted/spaced values.
  (
    cd "$APP_DIR"
    node --env-file=.env.local --import tsx scripts/composio-listener.ts
  ) &
  COMPOSIO_PID=$!
fi

# Cleanup function
cleanup() {
  echo ""
  echo "🛑 Shutting down development servers..."

  # Kill the monitors before their targets, or they respawn what we just killed.
  if [ ! -z "$BACKEND_MONITOR_PID" ]; then
    kill -9 $BACKEND_MONITOR_PID 2>/dev/null || true
  fi
  if [ ! -z "$III_COMPOSE_MONITOR_PID" ]; then
    kill -9 $III_COMPOSE_MONITOR_PID 2>/dev/null || true
  fi

  if [ ! -z "$BACKEND_PID" ]; then
    echo "   Stopping backend (PID $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null || true
  fi

  if [ ! -z "$INDEX_WATCHER_PID" ]; then
    kill $INDEX_WATCHER_PID 2>/dev/null || true
  fi

  if [ ! -z "$FRONTEND_PID" ]; then
    echo "   Stopping frontend (PID $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null || true
  fi

  if [ ! -z "$LANDING_PID" ]; then
    echo "   Stopping landing app (PID $LANDING_PID)..."
    kill $LANDING_PID 2>/dev/null || true
  fi

  if [ ! -z "$YJS_PID" ]; then
    echo "   Stopping Yjs server (PID $YJS_PID)..."
    kill $YJS_PID 2>/dev/null || true
  fi

  if [ ! -z "$COMPOSIO_PID" ]; then
    echo "   Stopping Composio listener (PID $COMPOSIO_PID)..."
    kill $COMPOSIO_PID 2>/dev/null || true
  fi

  # Wait a moment for graceful shutdown
  sleep 1

  # Kill by process name to catch orphaned children
  pkill -9 -f "src/backend/main.ts" 2>/dev/null || true
  pkill -9 -f "generate-step-index" 2>/dev/null || true
  [ ! -z "$III_COMPOSE_MONITOR_PID" ] && kill -9 $III_COMPOSE_MONITOR_PID 2>/dev/null || true
  [ ! -z "$III_COMPOSE_PID" ] && kill -9 $III_COMPOSE_PID 2>/dev/null || true
  pkill -9 -f "\.iii/bin/iii" 2>/dev/null || true
  pkill -9 -f "iii-worker" 2>/dev/null || true
  # Kill engine by port (binary name "iii" matches too broadly for pkill)
  lsof -ti :49134 2>/dev/null | xargs kill -9 2>/dev/null || true
  pkill -9 -f "next dev -p 4001" 2>/dev/null || true
  pkill -9 -f "next dev -p 4003" 2>/dev/null || true
  pkill -9 -f "yjs-server/server" 2>/dev/null || true

  # Extra cleanup to ensure ports are freed
  lsof -ti :4000 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti :4001 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti :4002 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti :4003 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti :4004 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti :4014 2>/dev/null | xargs kill -9 2>/dev/null || true

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
LANDING_STATUS="❌"
COMPOSIO_STATUS=""

curl -s http://localhost:4000/api/health > /dev/null 2>&1 && BACKEND_STATUS="✅"
curl -s http://localhost:4001 > /dev/null 2>&1 && FRONTEND_STATUS="✅"
lsof -i :4002 | grep LISTEN > /dev/null 2>&1 && YJS_STATUS="✅"
curl -s http://localhost:4003 > /dev/null 2>&1 && LANDING_STATUS="✅"
if [ ! -z "$COMPOSIO_PID" ]; then
  kill -0 $COMPOSIO_PID 2>/dev/null && COMPOSIO_STATUS="✅" || COMPOSIO_STATUS="❌"
fi

# Display server URLs
SERVER_COUNT=4
[ ! -z "$COMPOSIO_PID" ] && SERVER_COUNT=5

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All $SERVER_COUNT servers are running:"
echo "  🔧 Backend (iii engine):   http://localhost:4000 $BACKEND_STATUS (compose $III_COMPOSE_PID, app $BACKEND_PID)"
echo "  🌐 Frontend (Veritio):     http://localhost:4001 $FRONTEND_STATUS (PID $FRONTEND_PID)"
echo "  🔄 Yjs WebSocket:          ws://localhost:4002 $YJS_STATUS (PID $YJS_PID)"
echo "  🏠 Landing (multi-zone):   http://localhost:4003 $LANDING_STATUS (PID $LANDING_PID)"
echo "  📡 Stream WebSocket:       ws://localhost:4004 (RBAC listener)"
if [ ! -z "$COMPOSIO_PID" ]; then
  echo "  🔗 Composio Listener:      (trigger subscriber) $COMPOSIO_STATUS (PID $COMPOSIO_PID)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo "   • Press Ctrl+C to stop all servers"
echo "   • iii engine: HTTP :4000, stream WS :4004, worker bridge :49134"
echo "   • Observability UI: .iii/bin/iii console (replaces Motia Workbench)"
echo ""

# Wait for all processes
wait

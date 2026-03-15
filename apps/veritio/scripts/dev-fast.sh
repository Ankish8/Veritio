#!/bin/bash
# Fast development startup - starts backend + frontend only (skips Yjs + prototype)
# Architecture (Motia v1 / iii engine):
#   1. iii engine   → HTTP port 4000 + Stream WebSocket port 4004 + internal port 49134
#   2. motia-iii dev → compiles steps → dist/index-dev.js
#   3. dist/index-dev.js → connects to iii engine
#   4. Next.js frontend on port 4001

echo "🚀 Starting development servers (fast mode)..."

# Quick port cleanup
lsof -ti :4000 | xargs kill -9 2>/dev/null || true
lsof -ti :4001 | xargs kill -9 2>/dev/null || true
lsof -ti :4004 | xargs kill -9 2>/dev/null || true
lsof -ti :49134 | xargs kill -9 2>/dev/null || true
sleep 1

# Start iii engine
echo "▶ Starting iii engine on port 4000..."
~/.local/bin/iii &
III_PID=$!

# Wait for iii to bind
attempts=0
while ! lsof -ti :4000 > /dev/null 2>&1; do
  attempts=$((attempts + 1))
  [ $attempts -ge 10 ] && echo "❌ iii failed to start" && exit 1
  sleep 1
done
echo "   iii engine ready"

# Build the Motia app
echo "🔨 Building Motia app..."
bun run --bun motia-iii dev
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# Start the compiled app
echo "▶ Starting Motia app on port 4000..."
bun --env-file=.env.local dist/index-dev.js &
BACKEND_PID=$!

echo "▶ Starting Next.js frontend on port 4001..."
bun run --bun next dev -p 4001 --hostname 0.0.0.0 &
FRONTEND_PID=$!

echo ""
echo "✅ All servers starting!"
echo ""
echo "   Frontend: http://localhost:4001"
echo "   Backend:  http://localhost:4000"
echo "   Streams:  ws://localhost:4004"
echo "   iii:      ws://localhost:49134 (internal)"
echo ""
echo "💡 Tip: First page load may be slow while both servers warm up."
echo ""

# Cleanup function
cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  [ ! -z "$III_PID" ] && kill $III_PID 2>/dev/null
  lsof -ti :4000,:4001,:4004,:49134 | xargs kill -9 2>/dev/null || true
  exit 0
}

trap cleanup EXIT INT TERM

wait

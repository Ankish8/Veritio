/**
 * Yjs WebSocket Server with Proper Protocol Support
 *
 * Uses y-websocket's setupWSConnection for correct protocol handling.
 * Provides real-time collaborative editing via Yjs CRDTs.
 * Uses Supabase for durable persistence.
 *
 * Authentication: JWT token passed as query parameter
 * Document naming: "study:{studyId}"
 */

import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import * as Y from 'yjs'
import { jwtVerify } from 'jose'
import { SupabasePersistence } from './persistence/supabase-persistence'

// Environment configuration
// Railway provides PORT variable - use that in production, otherwise use YJS_PORT
const PORT = Number(process.env.PORT) || Number(process.env.YJS_PORT) || 4002
const HOST = process.env.YJS_HOST || '0.0.0.0'
const JWT_SECRET = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || 'development-secret'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const INTERNAL_API_KEY = process.env.YJS_INTERNAL_API_KEY

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('[Yjs] Warning: Supabase credentials not configured. Running without Supabase persistence.')
}

// Initialize Supabase persistence
let supabase: SupabasePersistence | null = null
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = new SupabasePersistence({
    url: SUPABASE_URL,
    serviceKey: SUPABASE_SERVICE_KEY,
  })
}

// In-memory document store
const docs = new Map<string, Y.Doc>()

// Debounced Supabase writes (5 second window to batch updates)
const supabaseWriteTimers = new Map<string, ReturnType<typeof setTimeout>>()
const SUPABASE_DEBOUNCE_MS = 5000

function debouncedSupabaseWrite(docName: string) {
  if (!supabase) return

  const existing = supabaseWriteTimers.get(docName)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(async () => {
    const doc = docs.get(docName)
    if (doc) {
      const state = Y.encodeStateAsUpdate(doc)
      const success = await supabase.storeDocument(docName, state)
      if (success) {
        // Persisted successfully
      }
    }
    supabaseWriteTimers.delete(docName)
  }, SUPABASE_DEBOUNCE_MS)

  supabaseWriteTimers.set(docName, timer)
}

/**
 * Get or create a Yjs document, loading from persistence if available
 */
async function getDoc(docName: string, gc = true): Promise<Y.Doc> {
  let doc = docs.get(docName)
  if (doc) return doc

  doc = new Y.Doc({ gc })
  docs.set(docName, doc)

  // Try to load from Supabase
  if (supabase) {
    try {
      const state = await supabase.getYDoc(docName)
      if (state && state.length > 0) {
        Y.applyUpdate(doc, state)
      }
    } catch (error) {
      console.error(`[Yjs] Error loading ${docName} from Supabase:`, error)
    }
  }

  // Set up update handler for persistence
  doc.on('update', () => {
    debouncedSupabaseWrite(docName)
  })

  return doc
}

const MAX_PREWARM_BODY_BYTES = 1024 * 1024

function sendJson(res: http.ServerResponse, status: number, body: Record<string, unknown>) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let totalSize = 0

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    totalSize += buffer.length
    if (totalSize > MAX_PREWARM_BODY_BYTES) {
      throw new Error('Payload too large')
    }
    chunks.push(buffer)
  }

  const body = Buffer.concat(chunks).toString('utf8').trim()
  if (!body) return {}
  return JSON.parse(body) as Record<string, unknown>
}

function getHeaderValue(header: string | string[] | undefined): string | null {
  if (!header) return null
  return Array.isArray(header) ? header[0] ?? null : header
}

/**
 * Verify JWT token and extract user info
 */
async function verifyToken(token: string): Promise<{ id: string; email: string; name?: string } | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

    const userId = (payload.sub as string) || (payload.id as string)
    const email = payload.email as string

    if (!userId) {
      console.error('[Yjs] JWT missing user ID')
      return null
    }

    return {
      id: userId,
      email: email || '',
      name: payload.name as string,
    }
  } catch (error) {
    console.error('[Yjs] JWT verification failed:', error)
    return null
  }
}

// Message types for y-websocket protocol
const messageSync = 0
const messageAwareness = 1

// Encoding utilities
const encoding = {
  createEncoder: () => {
    const arr: number[] = []
    return {
      arr,
      write: (byte: number) => arr.push(byte),
      writeVarUint: (num: number) => {
        while (num > 0x7f) {
          arr.push((num & 0x7f) | 0x80)
          num = Math.floor(num / 128)
        }
        arr.push(num)
      },
      writeVarUint8Array: (data: Uint8Array) => {
        // Write length
        let len = data.length
        while (len > 0x7f) {
          arr.push((len & 0x7f) | 0x80)
          len = Math.floor(len / 128)
        }
        arr.push(len)
        // Write data
        for (const byte of data) {
          arr.push(byte)
        }
      },
      toUint8Array: () => new Uint8Array(arr),
    }
  },
}

const decoding = {
  createDecoder: (data: Uint8Array) => {
    let pos = 0
    return {
      readVarUint: () => {
        let num = 0
        let mult = 1
        while (pos < data.length) {
          const byte = data[pos++]
          num += (byte & 0x7f) * mult
          if (byte < 0x80) break
          mult *= 128
        }
        return num
      },
      readVarUint8Array: () => {
        let len = 0
        let mult = 1
        while (pos < data.length) {
          const byte = data[pos++]
          len += (byte & 0x7f) * mult
          if (byte < 0x80) break
          mult *= 128
        }
        return data.slice(pos, (pos += len))
      },
      hasContent: () => pos < data.length,
    }
  },
}

// Sync protocol message types
const syncStep1 = 0
const syncStep2 = 1
const syncUpdate = 2

/**
 * Handle sync step 1 - client sends state vector, we respond with missing updates
 */
function writeSyncStep1(encoder: ReturnType<typeof encoding.createEncoder>, doc: Y.Doc) {
  encoder.write(syncStep1)
  encoder.writeVarUint8Array(Y.encodeStateVector(doc))
}

/**
 * Handle sync step 2 - send update based on client's state vector
 */
function writeSyncStep2(encoder: ReturnType<typeof encoding.createEncoder>, doc: Y.Doc, encodedStateVector: Uint8Array) {
  encoder.write(syncStep2)
  encoder.writeVarUint8Array(Y.encodeStateAsUpdate(doc, encodedStateVector))
}

/**
 * Write an update message
 */
function writeUpdate(encoder: ReturnType<typeof encoding.createEncoder>, update: Uint8Array) {
  encoder.write(syncUpdate)
  encoder.writeVarUint8Array(update)
}

/**
 * Read and handle a sync message
 */
function readSyncMessage(
  decoder: ReturnType<typeof decoding.createDecoder>,
  encoder: ReturnType<typeof encoding.createEncoder>,
  doc: Y.Doc,
  transactionOrigin: unknown
): number {
  const messageType = decoder.readVarUint()
  switch (messageType) {
    case syncStep1: {
      // Client sent state vector, respond with sync step 2
      const encodedStateVector = decoder.readVarUint8Array()
      writeSyncStep2(encoder, doc, encodedStateVector)
      break
    }
    case syncStep2:
    case syncUpdate: {
      // Client sent update, apply it
      const update = decoder.readVarUint8Array()
      Y.applyUpdate(doc, update, transactionOrigin)
      break
    }
    default:
      throw new Error(`Unknown sync message type: ${messageType}`)
  }
  return messageType
}

// Connection tracking
interface WSConnection extends WebSocket {
  docName?: string
  isAlive?: boolean
  awarenessClientId?: number // Track awareness client ID for cleanup
}

const connections = new Map<string, Set<WSConnection>>()

// Awareness client ID tracking (extracted from awareness messages)
const awarenessClocks = new Map<string, Map<number, number>>() // docName -> clientId -> clock

// Store the latest raw awareness update for each client so we can replay to new connections
// Without this, a newly connecting client never learns about already-connected clients' presence
const awarenessStates = new Map<string, Map<number, Uint8Array>>() // docName -> clientId -> last raw awareness update

/**
 * Setup WebSocket connection with proper y-websocket protocol
 */
async function setupWSConnection(ws: WSConnection, docName: string) {
  ws.docName = docName
  ws.isAlive = true

  // Get or create document
  const doc = await getDoc(docName)

  // Track connection
  if (!connections.has(docName)) {
    connections.set(docName, new Set())
  }
  connections.get(docName)!.add(ws)

  // Send sync step 1 to initiate sync
  const encoder = encoding.createEncoder()
  encoder.write(messageSync)
  writeSyncStep1(encoder, doc)
  ws.send(encoder.toUint8Array())

  // Replay existing awareness states to the new connection
  // Without this, the new client won't know about other users' presence
  const existingStates = awarenessStates.get(docName)
  if (existingStates && existingStates.size > 0) {
    for (const [, rawUpdate] of existingStates) {
      const awarenessEncoder = encoding.createEncoder()
      awarenessEncoder.write(messageAwareness)
      awarenessEncoder.writeVarUint8Array(rawUpdate)
      ws.send(awarenessEncoder.toUint8Array())
    }
  }

  // Set up update observer to broadcast changes
  const updateHandler = (update: Uint8Array, origin: unknown) => {
    if (origin !== ws) {
      // Broadcast to this connection
      const updateEncoder = encoding.createEncoder()
      updateEncoder.write(messageSync)
      writeUpdate(updateEncoder, update)
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(updateEncoder.toUint8Array())
      }
    }
  }
  doc.on('update', updateHandler)

  // Handle incoming messages
  ws.on('message', (data: Buffer) => {
    try {
      const message = new Uint8Array(data)
      const decoder = decoding.createDecoder(message)
      const encoder = encoding.createEncoder()

      const messageType = decoder.readVarUint()

      switch (messageType) {
        case messageSync: {
          encoder.write(messageSync)
          readSyncMessage(decoder, encoder, doc, ws)
          if (encoder.arr.length > 1) {
            ws.send(encoder.toUint8Array())
          }
          break
        }
        case messageAwareness: {
          // Broadcast awareness to other clients
          const awarenessUpdate = decoder.readVarUint8Array()

          // Extract clientId from awareness update for cleanup on disconnect
          // Awareness format: [clientCount, ...for each: clientId, clock, stateJson]
          try {
            const awarenessDecoder = decoding.createDecoder(awarenessUpdate)
            const clientCount = awarenessDecoder.readVarUint()
            if (clientCount > 0) {
              const clientId = awarenessDecoder.readVarUint()
              const clock = awarenessDecoder.readVarUint()
              // Store clientId on connection for cleanup
              ws.awarenessClientId = clientId
              // Track clock for this client
              if (!awarenessClocks.has(docName)) {
                awarenessClocks.set(docName, new Map())
              }
              awarenessClocks.get(docName)!.set(clientId, clock)

              // Store the raw awareness update so we can replay it to new connections
              if (!awarenessStates.has(docName)) {
                awarenessStates.set(docName, new Map())
              }
              awarenessStates.get(docName)!.set(clientId, awarenessUpdate)
            }
          } catch {
            // Ignore parsing errors, still broadcast
          }

          const conns = connections.get(docName)
          if (conns) {
            const awarenessEncoder = encoding.createEncoder()
            awarenessEncoder.write(messageAwareness)
            awarenessEncoder.writeVarUint8Array(awarenessUpdate)
            const awarenessMessage = awarenessEncoder.toUint8Array()
            for (const conn of conns) {
              if (conn !== ws && conn.readyState === WebSocket.OPEN) {
                conn.send(awarenessMessage)
              }
            }
          }
          break
        }
        default:
          console.warn(`[Yjs] Unknown message type: ${messageType}`)
      }
    } catch (error) {
      console.error('[Yjs] Error handling message:', error)
    }
  })

  // Handle pong for keep-alive
  ws.on('pong', () => {
    ws.isAlive = true
  })

  // Handle close
  ws.on('close', () => {
    doc.off('update', updateHandler)
    const conns = connections.get(docName)

    // Broadcast awareness removal for this client BEFORE removing from connections
    if (ws.awarenessClientId !== undefined && conns && conns.size > 1) {
      const clientId = ws.awarenessClientId
      const currentClock = awarenessClocks.get(docName)?.get(clientId) || 0

      // Build awareness removal message: [1, clientId, clock+1, "null"]
      // This tells other clients to remove this user's awareness state
      const removalEncoder = encoding.createEncoder()
      removalEncoder.writeVarUint(1) // 1 client in this update
      removalEncoder.writeVarUint(clientId)
      removalEncoder.writeVarUint(currentClock + 1) // Increment clock
      const nullState = new TextEncoder().encode('null')
      removalEncoder.writeVarUint8Array(nullState)

      // Wrap in awareness message
      const awarenessEncoder = encoding.createEncoder()
      awarenessEncoder.write(messageAwareness)
      awarenessEncoder.writeVarUint8Array(removalEncoder.toUint8Array())
      const removalMessage = awarenessEncoder.toUint8Array()

      // Broadcast to remaining clients
      for (const conn of conns) {
        if (conn !== ws && conn.readyState === WebSocket.OPEN) {
          conn.send(removalMessage)
        }
      }

      // Clean up clock and state tracking
      awarenessClocks.get(docName)?.delete(clientId)
      awarenessStates.get(docName)?.delete(clientId)
    }

    if (conns) {
      conns.delete(ws)
      if (conns.size === 0) {
        connections.delete(docName)
        awarenessClocks.delete(docName)
        awarenessStates.delete(docName)
      }
    }
  })

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[Yjs] WebSocket error for ${docName}:`, error)
  })
}

// Create HTTP server for health checks and internal helpers
const server = http.createServer(async (req, res) => {
  const requestPath = req.url?.split('?')[0] || ''

  if (req.method === 'POST' && requestPath === '/prewarm') {
    if (INTERNAL_API_KEY) {
      const providedKey = getHeaderValue(req.headers['x-internal-api-key'])
      if (providedKey !== INTERNAL_API_KEY) {
        sendJson(res, 401, { error: 'Unauthorized' })
        return
      }
    }

    try {
      const body = await readJsonBody(req)
      const docName = typeof body.docName === 'string' ? body.docName.trim() : ''

      if (!docName) {
        sendJson(res, 400, { error: 'docName is required' })
        return
      }

      await getDoc(docName)
      sendJson(res, 200, { success: true, cached: true })
      return
    } catch (error) {
      if (error instanceof SyntaxError) {
        sendJson(res, 400, { error: 'Invalid JSON' })
        return
      }
      if (error instanceof Error && error.message === 'Payload too large') {
        sendJson(res, 413, { error: 'Payload too large' })
        return
      }
      console.error('[Yjs] Prewarm error:', error)
      sendJson(res, 500, { error: 'Internal Server Error' })
      return
    }
  }

  if (requestPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'healthy',
        activeDocuments: docs.size,
        totalConnections: Array.from(connections.values()).reduce((sum, set) => sum + set.size, 0),
        persistence: {
          supabase: !!supabase,
        },
      })
    )
    return
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Yjs WebSocket Server')
})

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true })

// Handle WebSocket upgrade
server.on('upgrade', async (req, socket, head) => {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const token = url.searchParams.get('token')
    const docName = url.pathname.slice(1) // Remove leading slash

    if (!docName) {
      console.error('[Yjs] No document name provided')
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
      return
    }

    // In development, allow connections without auth for testing
    const isDev = process.env.NODE_ENV !== 'production'
    let user: { id: string; email: string; name?: string } | null = null

    if (token) {
      user = await verifyToken(token)
    }

    if (!user && !isDev) {
      console.error('[Yjs] Authentication failed for', docName)
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
      socket.destroy()
      return
    }

    wss.handleUpgrade(req, socket, head, async (ws) => {
      await setupWSConnection(ws as WSConnection, docName)
    })
  } catch (error) {
    console.error('[Yjs] Upgrade error:', error)
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n')
    socket.destroy()
  }
})

// Keep-alive ping interval (optimized to skip when no connections)
const pingInterval = setInterval(() => {
  // Early exit if no active connections (cost optimization)
  if (connections.size === 0) {
    return
  }

  for (const conns of connections.values()) {
    for (const ws of conns) {
      if (ws.isAlive === false) {
        ws.terminate()
        continue
      }
      ws.isAlive = false
      ws.ping()
    }
  }
}, 30000)

wss.on('close', () => {
  clearInterval(pingInterval)
})

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`[Yjs] Received ${signal}, shutting down gracefully...`)

  // Stop accepting new connections
  server.close()
  clearInterval(pingInterval)

  // Flush all pending Supabase writes
  const flushPromises: Promise<void>[] = []
  for (const [docName, timer] of supabaseWriteTimers) {
    clearTimeout(timer)
    const doc = docs.get(docName)
    if (doc && supabase) {
      const state = Y.encodeStateAsUpdate(doc)
      flushPromises.push(
        supabase.storeDocument(docName, state).then(() => {}).catch((err) => {
          console.error(`[Yjs] Failed to flush ${docName}:`, err)
        })
      )
    }
  }

  // Wait for all flushes (max 5s)
  await Promise.race([
    Promise.all(flushPromises),
    new Promise(resolve => setTimeout(resolve, 5000)),
  ])

  // Close all WebSocket connections with 1001 (Going Away)
  for (const conns of connections.values()) {
    for (const ws of conns) {
      ws.close(1001, 'Server shutting down')
    }
  }

  process.exit(0)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Start server
server.listen(PORT, HOST, () => {
  console.log(`[Yjs] Server started on ${HOST}:${PORT}`)
  console.log(`[Yjs] Supabase persistence: ${supabase ? 'enabled' : 'disabled'}`)
})

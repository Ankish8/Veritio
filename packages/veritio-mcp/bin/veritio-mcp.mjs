#!/usr/bin/env node
/**
 * Local stdio bridge to the Veritio MCP server.
 *
 * Some MCP clients can only launch a local process and speak JSON-RPC over
 * stdio; they cannot connect to a remote HTTP server. This forwards each stdio
 * message to the hosted endpoint and writes the response back, so those clients
 * get the same server as everyone else.
 *
 * Usage:
 *   VERITIO_API_KEY=vrt_... npx @veritiolabs/mcp-stdio
 *   VERITIO_API_KEY=vrt_... npx @veritiolabs/mcp-stdio --readonly
 *   VERITIO_API_KEY=vrt_... VERITIO_URL=http://localhost:4001 npx @veritiolabs/mcp-stdio
 *
 * Deliberately dependency-free: it runs via npx on a user's machine, so every
 * dependency is both a startup cost and a supply-chain surface.
 */

import { createInterface } from 'node:readline'

const args = process.argv.slice(2)
const readOnly = args.includes('--readonly')

function flag(name) {
  const i = args.indexOf(name)
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined
}

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    [
      'veritio-mcp — local stdio bridge to the Veritio MCP server',
      '',
      'Options:',
      '  --readonly        Connect to the read-only endpoint (no mutating tools)',
      '  --url <origin>    Override the Veritio origin (default https://veritio.io)',
      '  --key <key>       API key (prefer the VERITIO_API_KEY env var)',
      '  --features <a,b>  Only load these tool groups',
      '',
      'Environment:',
      '  VERITIO_API_KEY   Your Veritio API key (vrt_...). Required.',
      '  VERITIO_URL       Origin override, same as --url.',
      '',
      'Most clients can connect to https://veritio.io/mcp directly and do not',
      'need this bridge. Use it only if yours cannot.',
      '',
    ].join('\n'),
  )
  process.exit(0)
}

const apiKey = process.env.VERITIO_API_KEY ?? flag('--key')
if (!apiKey) {
  process.stderr.write(
    'veritio-mcp: no API key. Set VERITIO_API_KEY (or pass --key).\n' +
      'Create one in Veritio under Settings, then:\n' +
      '  VERITIO_API_KEY=vrt_... npx @veritiolabs/mcp-stdio\n',
  )
  process.exit(1)
}

const origin = (process.env.VERITIO_URL ?? flag('--url') ?? 'https://veritio.io').replace(/\/+$/, '')
const features = process.env.VERITIO_FEATURES ?? flag('--features')
const endpoint =
  `${origin}/mcp${readOnly ? '/readonly' : ''}` + (features ? `?features=${encodeURIComponent(features)}` : '')

/** Write one JSON-RPC message to stdout as a single line. */
function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

function errorFor(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

/**
 * The remote answers either a JSON body or an SSE stream, depending on whether
 * the server upgraded the response. Handle both, and forward every SSE data
 * frame so mid-call notifications are not swallowed.
 */
async function forward(payload) {
  let res
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${apiKey}`,
        'user-agent': 'veritio-mcp-stdio',
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    send(errorFor(payload.id, -32603, `Could not reach ${origin}: ${err.message}`))
    return
  }

  if (res.status === 401) {
    send(errorFor(payload.id, -32001, 'Veritio rejected this API key. Check VERITIO_API_KEY, or issue a new key.'))
    return
  }

  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('text/event-stream') && res.body) {
    const decoder = new TextDecoder()
    let buffer = ''
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true })
      // SSE frames are separated by a blank line.
      let split
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, split)
        buffer = buffer.slice(split + 2)
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data) process.stdout.write(`${data}\n`)
        }
      }
    }
    return
  }

  const text = await res.text()
  if (!text) {
    // 202 with no body: a notification was accepted. Nothing to forward.
    if (res.status === 202 || res.status === 204) return
    send(errorFor(payload.id, -32603, `Veritio returned ${res.status} with an empty body.`))
    return
  }
  process.stdout.write(`${text.trim()}\n`)
}

/**
 * Messages are handled in arrival order.
 *
 * The protocol is stateless, so concurrent requests would be safe on the
 * server — but a client that pipelines and expects ordered replies is easier to
 * support if we simply do not reorder anything.
 */
let chain = Promise.resolve()

createInterface({ input: process.stdin }).on('line', (line) => {
  const trimmed = line.trim()
  if (!trimmed) return

  let payload
  try {
    payload = JSON.parse(trimmed)
  } catch {
    send(errorFor(null, -32700, 'Parse error: stdin line was not valid JSON.'))
    return
  }

  chain = chain.then(() => forward(payload)).catch((err) => {
    send(errorFor(payload?.id, -32603, `Bridge error: ${err.message}`))
  })
})

process.stdin.on('end', () => {
  chain.finally(() => process.exit(0))
})

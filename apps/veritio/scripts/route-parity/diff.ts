/**
 * Route-parity diff — compares two capture.ts outputs (old vs new engine).
 *
 * Usage: bun scripts/route-parity/diff.ts /tmp/old.json /tmp/new.json
 *
 * Exit 0 when every route matches on status + normalized body + content
 * type; exit 1 with a per-route report otherwise. Volatile fields
 * (timestamps, latencies, uuids in bodies) are normalized before comparison.
 */

import { readFileSync } from 'node:fs'

interface CaptureResult {
  key: string
  stepId: string
  status: number
  contentType: string
  body: unknown
}

const [oldPath, newPath] = process.argv.slice(2)
if (!oldPath || !newPath) {
  console.error('usage: bun scripts/route-parity/diff.ts <old.json> <new.json>')
  process.exit(2)
}

const VOLATILE_KEYS = new Set([
  'timestamp', 'time', 'created_at', 'updated_at', 'createdAt', 'updatedAt',
  'latency_ms', 'latencyMs', 'expires_at', 'expiresAt', 'error_id',
  'traceId', 'trace_id', 'requestId', 'request_id', 'id', 'token',
])

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = VOLATILE_KEYS.has(k) ? '<volatile>' : normalize(v)
    }
    return out
  }
  return value
}

function load(p: string): Map<string, CaptureResult> {
  const data = JSON.parse(readFileSync(p, 'utf8')) as { results: CaptureResult[] }
  return new Map(data.results.map((r) => [r.key, r]))
}

const oldResults = load(oldPath)
const newResults = load(newPath)

let pass = 0
const failures: string[] = []

for (const [key, oldR] of oldResults) {
  const newR = newResults.get(key)
  if (!newR) {
    failures.push(`MISSING in new: ${key}`)
    continue
  }
  const statusOk = oldR.status === newR.status
  const typeOk = oldR.contentType === newR.contentType
  const bodyOk = JSON.stringify(normalize(oldR.body)) === JSON.stringify(normalize(newR.body))
  if (statusOk && typeOk && bodyOk) {
    pass += 1
  } else {
    const parts: string[] = []
    if (!statusOk) parts.push(`status ${oldR.status}→${newR.status}`)
    if (!typeOk) parts.push(`content-type '${oldR.contentType}'→'${newR.contentType}'`)
    if (!bodyOk) {
      parts.push(
        `body old=${JSON.stringify(normalize(oldR.body))?.slice(0, 220)} new=${JSON.stringify(normalize(newR.body))?.slice(0, 220)}`
      )
    }
    failures.push(`${key}\n    ${parts.join('\n    ')}`)
  }
}

for (const key of newResults.keys()) {
  if (!oldResults.has(key)) failures.push(`EXTRA in new: ${key}`)
}

console.log(`route-parity: ${pass} matched, ${failures.length} mismatched (of ${oldResults.size} old routes)`)
if (failures.length > 0) {
  console.log('\n--- mismatches ---')
  for (const f of failures) console.log(`✗ ${f}\n`)
  process.exit(1)
}

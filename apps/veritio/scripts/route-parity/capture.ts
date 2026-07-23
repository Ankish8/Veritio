/**
 * Route-parity capture — fires a deterministic request corpus at a running
 * backend and records {status, contentType, body} per route.
 *
 * Usage:
 *   bun scripts/route-parity/capture.ts --base http://localhost:4000 --out /tmp/new.json
 *   AUTH_TOKEN=<bearer> bun scripts/route-parity/capture.ts ...   # adds an authed pass
 *
 * The corpus derives from the generated step index (every http trigger),
 * with :params filled by fixed placeholder values and an empty JSON body on
 * mutating methods — so authed routes exercise the middleware chain (401),
 * public routes exercise validation (400/404), and nothing writes real data.
 * Run against the OLD stack and the NEW stack, then diff with diff.ts.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { steps } from '../../src/backend/step-index.generated'
import type { HttpTrigger } from '../../src/lib/motia/types'

const args = process.argv.slice(2)
function argValue(flag: string, fallback: string): string {
  const i = args.indexOf(flag)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}

const BASE = argValue('--base', 'http://localhost:4000').replace(/\/$/, '')
const OUT = argValue('--out', '/tmp/route-parity-capture.json')
const AUTH_TOKEN = process.env.AUTH_TOKEN

// Fixed placeholder values so both captures send byte-identical requests.
const PARAM_VALUE: Record<string, string> = {}
const UUID = '00000000-0000-0000-0000-00000000dead'
function paramValue(name: string): string {
  return PARAM_VALUE[name] ?? (/id$/i.test(name) ? UUID : `parity-${name.toLowerCase()}`)
}

interface RouteCase {
  stepId: string
  method: string
  path: string
  url: string
  authed: boolean
}

interface CaptureResult {
  key: string
  stepId: string
  method: string
  path: string
  authed: boolean
  status: number
  contentType: string
  body: unknown
}

function buildCases(): RouteCase[] {
  const cases: RouteCase[] = []
  for (const { id, mod } of steps) {
    const trigger = mod.config?.triggers?.[0] as HttpTrigger | undefined
    if (!trigger || trigger.type !== 'http') continue
    const concrete = trigger.path.replace(/:([A-Za-z0-9_]+)/g, (_, name) => paramValue(name))
    cases.push({ stepId: id, method: trigger.method, path: trigger.path, url: `${BASE}${concrete}`, authed: false })
    // Authed tier is GET-only: it exercises the auth happy path + permission
    // middlewares without risking side effects from {}-body writes (curated
    // mutation flows are a separate, deliberate pass).
    if (AUTH_TOKEN && trigger.method === 'GET') {
      cases.push({ stepId: id, method: trigger.method, path: trigger.path, url: `${BASE}${concrete}`, authed: true })
    }
  }
  return cases.sort((a, b) => `${a.path} ${a.method} ${a.authed}`.localeCompare(`${b.path} ${b.method} ${b.authed}`))
}

async function fire(c: RouteCase): Promise<CaptureResult> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (c.authed && AUTH_TOKEN) headers.authorization = `Bearer ${AUTH_TOKEN}`
  const init: RequestInit = { method: c.method, headers, signal: AbortSignal.timeout(15_000) }
  if (c.method !== 'GET' && c.method !== 'HEAD') init.body = '{}'

  let status = 0
  let contentType = ''
  let body: unknown = null
  try {
    const res = await fetch(c.url, init)
    status = res.status
    contentType = (res.headers.get('content-type') ?? '').split(';')[0]
    const text = await res.text()
    try {
      body = JSON.parse(text)
    } catch {
      body = text.length > 2000 ? `${text.slice(0, 2000)}…[truncated ${text.length}]` : text
    }
  } catch (error) {
    status = -1
    body = String(error)
  }
  return {
    key: `${c.method} ${c.path}${c.authed ? ' [authed]' : ''}`,
    stepId: c.stepId,
    method: c.method,
    path: c.path,
    authed: c.authed,
    status,
    contentType,
    body,
  }
}

const cases = buildCases()
console.log(`[capture] ${cases.length} requests → ${BASE}`)

const results: CaptureResult[] = []
// Modest concurrency: deterministic enough, fast enough.
const CONCURRENCY = 8
for (let i = 0; i < cases.length; i += CONCURRENCY) {
  const batch = await Promise.all(cases.slice(i, i + CONCURRENCY).map(fire))
  results.push(...batch)
  if ((i / CONCURRENCY) % 10 === 0) process.stdout.write(`\r[capture] ${Math.min(i + CONCURRENCY, cases.length)}/${cases.length}`)
}
console.log(`\r[capture] ${cases.length}/${cases.length} done`)

mkdirSync(path.dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify({ base: BASE, capturedAt: new Date().toISOString(), results }, null, 1))
console.log(`[capture] wrote ${OUT}`)

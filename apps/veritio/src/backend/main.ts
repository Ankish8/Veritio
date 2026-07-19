/**
 * Backend entrypoint — connects to the iii engine and registers every step.
 *
 * Dev:  bun --env-file=.env.local --watch src/backend/main.ts
 * Prod: bun dist/backend.mjs   (bundled by scripts/build-backend.ts)
 *
 * The engine (iii) must be running first — see scripts/dev.sh / start.sh.
 */

import { getIIIClient, shutdownIIIClient } from '../lib/iii/worker'
import { registerStep } from '../lib/iii/register-step'
import { registerStreamLifecycle } from '../lib/iii/register-streams'
import { steps, streams } from './step-index.generated'

const startedAt = Date.now()
const client = getIIIClient()

const totals = { steps: 0, http: 0, queue: 0, cron: 0 }
const failures: Array<{ id: string; error: string }> = []

for (const { id, mod } of steps) {
  try {
    const counts = registerStep(client, id, mod)
    totals.steps += 1
    totals.http += counts.http
    totals.queue += counts.queue
    totals.cron += counts.cron
  } catch (error) {
    failures.push({ id, error: error instanceof Error ? error.message : String(error) })
  }
}

registerStreamLifecycle(client, [...streams])

// Boot manifest — the parity gate diffs these counts against the expected
// step census, so keep the shape stable.
console.log(
  JSON.stringify({
    level: 'info',
    time: new Date().toISOString(),
    msg: 'veritio backend registered',
    steps: totals.steps,
    triggers: { http: totals.http, queue: totals.queue, cron: totals.cron },
    streams: streams.length,
    failures: failures.length,
    registration_ms: Date.now() - startedAt,
  })
)

if (failures.length > 0) {
  for (const f of failures) {
    console.error(JSON.stringify({ level: 'error', msg: 'step registration failed', ...f }))
  }
  // Fail loud: a partially-registered backend serves 404s for missing routes,
  // which is strictly worse than a crash loop that pages someone.
  process.exit(1)
}

// Engine-side verification. Trigger registration is validated ASYNCHRONOUSLY
// by the engine (e.g. cron expression parsing) — a rejected trigger never
// surfaces as a client error, it just silently doesn't exist. Query the
// engine's registry and compare counts so silent drops crash the boot
// instead of shipping missing routes/schedules.
async function verifyEngineRegistration(): Promise<void> {
  const expected = totals.http + totals.queue + totals.cron
  try {
    const res = await client.trigger<Record<string, never>, { registered_triggers?: Array<{ function_id?: string }> }>({
      function_id: 'engine::registered-triggers::list',
      payload: {},
    })
    const registered = (res.registered_triggers ?? []).filter((t) =>
      String(t.function_id ?? '').startsWith('steps::')
    ).length
    if (registered !== expected) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'engine trigger registry mismatch — some triggers were rejected by the engine (check engine log for validation errors)',
          expected,
          registered,
        })
      )
      process.exit(1)
    }
    console.log(JSON.stringify({ level: 'info', msg: 'engine trigger registry verified', triggers: registered }))
  } catch (error) {
    // Verification is a guard, not a dependency — if the engine function is
    // unavailable, log and continue rather than blocking boot.
    console.error(
      JSON.stringify({ level: 'warn', msg: 'engine trigger verification skipped', error: String(error) })
    )
  }
}

// Give the engine a beat to process the registration batch before auditing.
setTimeout(() => void verifyEngineRegistration(), 3000)

async function shutdown(signal: string): Promise<void> {
  console.log(JSON.stringify({ level: 'info', msg: `received ${signal}, shutting down` }))
  try {
    await shutdownIIIClient()
  } finally {
    process.exit(0)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

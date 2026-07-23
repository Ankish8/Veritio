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
import { waitForTriggerRegistryReadiness } from '../lib/iii/trigger-registry-readiness'
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
  let lastPendingCount: number | null | undefined
  const result = await waitForTriggerRegistryReadiness({
    expected,
    readRegisteredCount: async () => {
      const res = await client.trigger<
        Record<string, never>,
        { registered_triggers?: Array<{ function_id?: string }> }
      >({
        function_id: 'engine::registered-triggers::list',
        payload: {},
      })
      return (res.registered_triggers ?? []).filter((t) =>
        String(t.function_id ?? '').startsWith('steps::'),
      ).length
    },
    onPending: ({ attempt, registered, error }) => {
      // Log the first observation and any count change. This preserves useful
      // startup diagnostics without flooding Railway while workers activate.
      if (attempt === 1 || registered !== lastPendingCount) {
        console.warn(
          JSON.stringify({
            level: 'warn',
            msg: 'engine trigger registry activation pending',
            expected,
            registered,
            attempt,
            ...(error ? { error } : {}),
          }),
        )
        lastPendingCount = registered
      }
    },
  })

  if (result.status === 'ready') {
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'engine trigger registry verified',
        triggers: result.registered,
        attempts: result.attempts,
        verification_ms: result.elapsedMs,
      }),
    )
    return
  }

  if (result.status === 'unavailable') {
    // Verification is a guard, not a dependency — if the engine function is
    // unavailable, log and continue rather than blocking boot.
    console.error(
      JSON.stringify({
        level: 'warn',
        msg: 'engine trigger verification skipped',
        attempts: result.attempts,
        verification_ms: result.elapsedMs,
        error: result.error,
      }),
    )
    return
  }

  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'engine trigger registry mismatch after readiness timeout — some triggers were rejected by the engine',
      expected,
      registered: result.registered,
      attempts: result.attempts,
      verification_ms: result.elapsedMs,
    }),
  )
  process.exit(1)
}

// Worker trigger types activate asynchronously. Start the audit immediately;
// it waits through normal HTTP/queue/cron startup races before deciding that
// the registry is genuinely incomplete.
void verifyEngineRegistration()

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

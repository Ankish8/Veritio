export interface TriggerRegistryReadinessOptions {
  expected: number
  readRegisteredCount: () => Promise<number>
  timeoutMs?: number
  pollIntervalMs?: number
  now?: () => number
  sleep?: (ms: number) => Promise<void>
  onPending?: (state: TriggerRegistryPendingState) => void
}

export interface TriggerRegistryPendingState {
  attempt: number
  expected: number
  registered: number | null
  error?: string
}

export type TriggerRegistryReadinessResult =
  | {
      status: 'ready'
      attempts: number
      registered: number
      elapsedMs: number
    }
  | {
      status: 'mismatch'
      attempts: number
      registered: number
      elapsedMs: number
    }
  | {
      status: 'unavailable'
      attempts: number
      registered: null
      elapsedMs: number
      error: string
    }

const DEFAULT_TIMEOUT_MS = 45_000
const DEFAULT_POLL_INTERVAL_MS = 1_000

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Wait for iii's asynchronous worker startup to finish activating every
 * registered trigger. HTTP, queue, and cron workers come online independently,
 * so a single early count can report a false partial-registry failure.
 */
export async function waitForTriggerRegistryReadiness({
  expected,
  readRegisteredCount,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  now = Date.now,
  sleep = defaultSleep,
  onPending,
}: TriggerRegistryReadinessOptions): Promise<TriggerRegistryReadinessResult> {
  const startedAt = now()
  const deadline = startedAt + timeoutMs
  let attempts = 0
  let lastRegistered: number | null = null
  let lastError: string | null = null

  while (true) {
    attempts += 1

    try {
      lastRegistered = await readRegisteredCount()
      lastError = null

      if (lastRegistered === expected) {
        return {
          status: 'ready',
          attempts,
          registered: lastRegistered,
          elapsedMs: now() - startedAt,
        }
      }
    } catch (error) {
      lastRegistered = null
      lastError = error instanceof Error ? error.message : String(error)
    }

    onPending?.({
      attempt: attempts,
      expected,
      registered: lastRegistered,
      ...(lastError ? { error: lastError } : {}),
    })

    const remainingMs = deadline - now()
    if (remainingMs <= 0) {
      if (lastRegistered !== null) {
        return {
          status: 'mismatch',
          attempts,
          registered: lastRegistered,
          elapsedMs: now() - startedAt,
        }
      }

      return {
        status: 'unavailable',
        attempts,
        registered: null,
        elapsedMs: now() - startedAt,
        error: lastError ?? 'Trigger registry could not be read',
      }
    }

    await sleep(Math.min(pollIntervalMs, remainingMs))
  }
}

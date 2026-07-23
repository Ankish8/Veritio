export interface AutosaveCoordinatorOptions {
  save: () => Promise<unknown>
  isDirty: () => boolean
  canSave: () => boolean
  onSavingChange?: (isSaving: boolean) => void
  debounceMs?: number
  maxWaitMs?: number
  retryBaseMs?: number
  retryMaxMs?: number
}

const DEFAULT_DEBOUNCE_MS = 500
const DEFAULT_MAX_WAIT_MS = 2_000
const DEFAULT_RETRY_BASE_MS = 2_000
const DEFAULT_RETRY_MAX_MS = 30_000

/**
 * Latest-wins autosave scheduler.
 *
 * The coordinator is framework-agnostic so its timing, race, and retry contract
 * can be tested independently from React. It never runs overlapping save flights.
 */
export class AutosaveCoordinator {
  private save: () => Promise<unknown>
  private isDirty: () => boolean
  private canSave: () => boolean
  private onSavingChange?: (isSaving: boolean) => void
  private debounceMs: number
  private maxWaitMs: number
  private retryBaseMs: number
  private retryMaxMs: number

  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private maxWaitTimer: ReturnType<typeof setTimeout> | null = null
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private activeFlight: Promise<void> | null = null
  private firstPendingAt: number | null = null
  private revision = 0
  private followupRequested = false
  private retryAttempt = 0
  private disposed = false

  constructor(options: AutosaveCoordinatorOptions) {
    this.save = options.save
    this.isDirty = options.isDirty
    this.canSave = options.canSave
    this.onSavingChange = options.onSavingChange
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
    this.maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
    this.retryBaseMs = options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS
    this.retryMaxMs = options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS
  }

  /**
   * Refresh React-owned callbacks without replacing the coordinator or losing
   * its active flight/timers. Call this from an effect after each render.
   */
  updateOptions(options: AutosaveCoordinatorOptions): void {
    this.save = options.save
    this.isDirty = options.isDirty
    this.canSave = options.canSave
    this.onSavingChange = options.onSavingChange
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS
    this.maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
    this.retryBaseMs = options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS
    this.retryMaxMs = options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS
  }

  /** Notify the coordinator that builder data changed. */
  notifyChange(): void {
    if (this.disposed) return
    this.revision += 1

    if (!this.isDirty()) {
      this.clearPendingTimers()
      return
    }

    if (this.activeFlight) {
      this.followupRequested = true
      return
    }

    this.scheduleTrailingSave()
  }

  /** Re-evaluate after hydration, reconnect, pause, or a successful acknowledgement. */
  sync(): void {
    if (this.disposed) return
    if (!this.isDirty()) {
      this.clearPendingTimers()
      this.retryAttempt = 0
      return
    }
    if (this.activeFlight) {
      this.followupRequested = true
      return
    }
    if (this.canSave()) this.scheduleSave(0)
  }

  /** Immediately persist current dirty state. Concurrent callers join the flight. */
  async flush(): Promise<void> {
    if (this.disposed || !this.isDirty() || !this.canSave()) return

    this.clearPendingTimers()
    if (this.activeFlight) {
      this.followupRequested = true
      await this.activeFlight
      if (this.isDirty() && this.canSave()) await this.flush()
      return
    }

    await this.startFlight()
    if (this.followupRequested && this.isDirty() && this.canSave()) {
      this.followupRequested = false
      await this.flush()
    }
  }

  dispose(): void {
    this.disposed = true
    this.clearPendingTimers()
  }

  cancelPending(): void {
    this.clearPendingTimers()
    this.followupRequested = false
  }

  private scheduleTrailingSave(): void {
    if (!this.canSave()) return

    const now = Date.now()
    if (this.firstPendingAt === null) this.firstPendingAt = now

    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      void this.flush().catch(() => {})
    }, this.debounceMs)

    if (!this.maxWaitTimer) {
      const elapsed = now - this.firstPendingAt
      this.maxWaitTimer = setTimeout(
        () => {
          this.maxWaitTimer = null
          void this.flush().catch(() => {})
        },
        Math.max(0, this.maxWaitMs - elapsed)
      )
    }
  }

  private scheduleSave(delayMs: number): void {
    if (!this.canSave() || !this.isDirty() || this.disposed) return
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      void this.flush().catch(() => {})
    }, delayMs)
  }

  private async startFlight(): Promise<void> {
    if (this.activeFlight) return this.activeFlight
    if (!this.canSave() || !this.isDirty() || this.disposed) return

    const startedRevision = this.revision
    this.followupRequested = false
    this.firstPendingAt = null
    this.clearPendingTimers()

    let succeeded = false
    const flight = (async () => {
      this.onSavingChange?.(true)
      try {
        await this.save()
        succeeded = true
        this.retryAttempt = 0
      } finally {
        this.onSavingChange?.(false)
      }
    })()

    this.activeFlight = flight
    try {
      await flight
    } catch (error) {
      this.scheduleRetry()
      throw error
    } finally {
      if (this.activeFlight === flight) this.activeFlight = null
    }

    if (!succeeded || !this.isDirty() || !this.canSave() || this.disposed) return

    const changedDuringSave = this.followupRequested || this.revision > startedRevision
    this.followupRequested = false
    this.scheduleSave(changedDuringSave ? 0 : this.debounceMs)
  }

  private scheduleRetry(): void {
    if (this.disposed || !this.isDirty()) return
    this.retryAttempt += 1
    const delay = Math.min(this.retryBaseMs * 2 ** (this.retryAttempt - 1), this.retryMaxMs)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      if (this.canSave()) {
        void this.flush().catch(() => {})
      }
    }, delay)
  }

  private clearPendingTimers(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer)
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.debounceTimer = null
    this.maxWaitTimer = null
    this.retryTimer = null
    this.firstPendingAt = null
  }
}

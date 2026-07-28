import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AutosaveCoordinator } from './autosave-coordinator'

describe('AutosaveCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses a trailing debounce for rapid edits', async () => {
    let dirty = true
    const save = vi.fn(async () => {
      dirty = false
    })
    const coordinator = new AutosaveCoordinator({
      save,
      isDirty: () => dirty,
      canSave: () => true,
    })

    coordinator.notifyChange()
    await vi.advanceTimersByTimeAsync(300)
    coordinator.notifyChange()
    await vi.advanceTimersByTimeAsync(499)
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
    coordinator.dispose()
  })

  it('persists continuous edits by the maximum-wait deadline', async () => {
    let dirty = true
    const save = vi.fn(async () => {
      dirty = false
    })
    const coordinator = new AutosaveCoordinator({
      save,
      isDirty: () => dirty,
      canSave: () => true,
    })

    coordinator.notifyChange()
    for (let elapsed = 0; elapsed < 1_800; elapsed += 300) {
      await vi.advanceTimersByTimeAsync(300)
      coordinator.notifyChange()
    }
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(200)
    expect(save).toHaveBeenCalledTimes(1)
    coordinator.dispose()
  })

  it('never overlaps flights and follows up edits made during a save', async () => {
    let dirty = true
    let resolveFirst = () => {}
    const save = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockImplementationOnce(async () => {
        dirty = false
      })
    const coordinator = new AutosaveCoordinator({
      save,
      isDirty: () => dirty,
      canSave: () => true,
    })

    coordinator.notifyChange()
    await vi.advanceTimersByTimeAsync(500)
    expect(save).toHaveBeenCalledTimes(1)

    coordinator.notifyChange()
    resolveFirst()
    await Promise.resolve()
    await vi.runAllTimersAsync()

    expect(save).toHaveBeenCalledTimes(2)
    coordinator.dispose()
  })

  it('joins concurrent manual flushes', async () => {
    let dirty = true
    let resolveSave = () => {}
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = () => {
            dirty = false
            resolve()
          }
        }),
    )
    const coordinator = new AutosaveCoordinator({
      save,
      isDirty: () => dirty,
      canSave: () => true,
    })

    const first = coordinator.flush()
    const second = coordinator.flush()
    expect(save).toHaveBeenCalledTimes(1)

    resolveSave()
    await Promise.all([first, second])
    expect(save).toHaveBeenCalledTimes(1)
    coordinator.dispose()
  })

  it('retains dirty state and retries after a failed flight', async () => {
    let dirty = true
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockImplementationOnce(async () => {
        dirty = false
      })
    const coordinator = new AutosaveCoordinator({
      save,
      isDirty: () => dirty,
      canSave: () => true,
      retryBaseMs: 1_000,
    })

    await expect(coordinator.flush()).rejects.toThrow('network')
    expect(dirty).toBe(true)

    await vi.advanceTimersByTimeAsync(1_000)
    expect(save).toHaveBeenCalledTimes(2)
    expect(dirty).toBe(false)
    coordinator.dispose()
  })

  it('waits while unavailable and flushes when availability returns', async () => {
    let dirty = true
    let online = false
    const save = vi.fn(async () => {
      dirty = false
    })
    const coordinator = new AutosaveCoordinator({
      save,
      isDirty: () => dirty,
      canSave: () => online,
    })

    coordinator.notifyChange()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(save).not.toHaveBeenCalled()

    online = true
    coordinator.sync()
    await vi.runAllTimersAsync()
    expect(save).toHaveBeenCalledTimes(1)
    coordinator.dispose()
  })

  it('uses refreshed callbacks without replacing an active coordinator', async () => {
    let dirty = true
    const firstSave = vi.fn(async () => {})
    const latestSave = vi.fn(async () => {
      dirty = false
    })
    const coordinator = new AutosaveCoordinator({
      save: firstSave,
      isDirty: () => dirty,
      canSave: () => true,
    })

    coordinator.updateOptions({
      save: latestSave,
      isDirty: () => dirty,
      canSave: () => true,
    })
    await coordinator.flush()

    expect(firstSave).not.toHaveBeenCalled()
    expect(latestSave).toHaveBeenCalledTimes(1)
    coordinator.dispose()
  })

  it('reactivates after a Strict Mode cleanup cycle', async () => {
    let dirty = true
    const save = vi.fn(async () => {
      dirty = false
    })
    const coordinator = new AutosaveCoordinator({
      save,
      isDirty: () => dirty,
      canSave: () => true,
    })

    coordinator.dispose()
    coordinator.activate()
    coordinator.notifyChange()
    await vi.advanceTimersByTimeAsync(500)

    expect(save).toHaveBeenCalledTimes(1)
    coordinator.dispose()
  })
})

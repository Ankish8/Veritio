import { describe, expect, it, vi } from 'vitest'
import { stopRecorderAndWait } from './stop-recorder'

/**
 * Stand-in for MediaRecorder: stop() delivers the final chunk and fires `stop`
 * on a later task, exactly as the real one does.
 */
function fakeRecorder(options: { deliverAfterMs?: number; neverStops?: boolean } = {}) {
  const chunks: string[] = []
  const recorder = {
    state: 'recording' as RecordingState,
    onstop: null as ((this: MediaRecorder, ev: Event) => unknown) | null,
    stop() {
      if (options.neverStops) return
      setTimeout(() => {
        // The last dataavailable lands before `stop` — this is the data the
        // upload buffer needs.
        chunks.push('final-chunk')
        recorder.state = 'inactive'
        recorder.onstop?.call(recorder as unknown as MediaRecorder, new Event('stop'))
      }, options.deliverAfterMs ?? 5)
    },
  }
  return { recorder, chunks }
}

describe('stopRecorderAndWait', () => {
  // The bug: flushing straight after stop() found an empty buffer, so a whole
  // session was finalized with zero parts.
  it('resolves only after the recorder delivered its final chunk', async () => {
    const { recorder, chunks } = fakeRecorder()

    await stopRecorderAndWait(recorder)

    expect(chunks).toEqual(['final-chunk'])
    expect(recorder.state).toBe('inactive')
  })

  it('does not wait on an already inactive recorder', async () => {
    const { recorder } = fakeRecorder()
    recorder.state = 'inactive'
    const stop = vi.spyOn(recorder, 'stop')

    await stopRecorderAndWait(recorder)

    expect(stop).not.toHaveBeenCalled()
  })

  it('resolves when there is no recorder', async () => {
    await expect(stopRecorderAndWait(null)).resolves.toBeUndefined()
  })

  it('preserves an existing onstop handler', async () => {
    const { recorder } = fakeRecorder()
    const existing = vi.fn()
    recorder.onstop = existing

    await stopRecorderAndWait(recorder)

    expect(existing).toHaveBeenCalledOnce()
  })

  // A recorder that never fires `stop` must not strand the participant on the
  // submitting screen.
  it('gives up after the timeout', async () => {
    vi.useFakeTimers()
    try {
      const { recorder } = fakeRecorder({ neverStops: true })
      let resolved = false
      const pending = stopRecorderAndWait(recorder, 1_000).then(() => {
        resolved = true
      })

      await vi.advanceTimersByTimeAsync(999)
      expect(resolved).toBe(false)

      await vi.advanceTimersByTimeAsync(2)
      await pending
      expect(resolved).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('resolves if stop() throws', async () => {
    const recorder = {
      state: 'recording' as RecordingState,
      onstop: null,
      stop() {
        throw new Error('InvalidStateError')
      },
    }

    await expect(stopRecorderAndWait(recorder)).resolves.toBeUndefined()
  })
})

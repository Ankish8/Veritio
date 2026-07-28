/**
 * MediaRecorder.stop() is asynchronous.
 *
 * It dispatches one last `dataavailable` event on a later task, and only then
 * `stop`. Because parts are buffered until TARGET_PART_SIZE, that final event
 * carries the whole recording for any session that never reached the threshold —
 * which is most of them, since a low-motion screen capture compresses well below
 * 10MB. Flushing the upload buffer straight after calling stop() therefore found
 * nothing to send and finalized an empty recording ("No recording data
 * captured"), or left the row stuck in `uploading` forever.
 *
 * Resolve only once the recorder has handed over its data.
 */
export function stopRecorderAndWait(
  recorder: Pick<MediaRecorder, 'state' | 'stop'> & {
    onstop?: ((this: MediaRecorder, ev: Event) => unknown) | null
  } | null,
  timeoutMs = 10_000
): Promise<void> {
  if (!recorder || recorder.state === 'inactive') return Promise.resolve()

  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve()
    }

    // Never block the participant on a recorder that does not fire `stop`.
    const timer = setTimeout(finish, timeoutMs)

    const previousOnStop = recorder.onstop
    recorder.onstop = function (this: MediaRecorder, event: Event) {
      previousOnStop?.call(this, event)
      finish()
    }

    try {
      recorder.stop()
    } catch {
      // Already stopping, or in a state that rejects stop(): nothing left to wait for.
      finish()
    }
  })
}

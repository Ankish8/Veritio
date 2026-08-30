/**
 * Randomness helpers for the prototype-test player.
 *
 * Both exist because the browser APIs they wrap are not universally available:
 * `crypto.randomUUID` is only exposed in secure contexts (so it is missing on
 * self-hosted deployments served over plain HTTP), and a
 * `sort(() => Math.random() - 0.5)` shuffle is measurably biased.
 */

/**
 * Generate a UUID v4.
 *
 * Prefers `crypto.randomUUID`, falls back to `crypto.getRandomValues`, and
 * finally to `Math.random` so task attempts still get an id on insecure
 * origins rather than throwing mid-study.
 */
export function randomId(): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }

  const bytes = new Uint8Array(16)
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  // Set the version (4) and variant (RFC 4122) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex: string[] = []
  for (let i = 0; i < bytes.length; i++) {
    hex.push(bytes[i].toString(16).padStart(2, '0'))
  }

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-')
}

/**
 * Return a new array shuffled with an unbiased Fisher-Yates pass.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Structured console logger implementing the MotiaLogger shim interface.
 *
 * One JSON line per call to stdout/stderr — Railway captures process output,
 * so this is the prod logging path (parity with rc.26's console fallback when
 * OTel was off; prod ran the memory exporter, i.e. workbench-only, which dies
 * with the Workbench anyway). Wiring @iii-dev/observability is a follow-up.
 */

import type { MotiaLogger } from '../motia/types'

function emit(
  level: 'info' | 'warn' | 'error' | 'debug',
  base: Record<string, unknown>,
  message: string,
  meta?: Record<string, unknown>
): void {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    msg: message,
    ...base,
    ...meta,
  })
  if (level === 'error' || level === 'warn') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export function createStepLogger(base: { step: string; traceId?: string }): MotiaLogger {
  return {
    info: (message, meta) => emit('info', base, message, meta),
    warn: (message, meta) => emit('warn', base, message, meta),
    error: (message, meta) => emit('error', base, message, meta),
    debug: (message, meta) => emit('debug', base, message, meta),
  }
}

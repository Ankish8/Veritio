/**
 * iii worker bootstrap — the app's single connection to the iii engine.
 *
 * The compiled backend (src/backend/main.ts → dist/backend.mjs) runs as a
 * sibling process of the engine and connects to its trusted worker listener
 * (ws://localhost:49134). Every step's functions and triggers register over
 * this connection.
 */

import { registerWorker, type IIIClient } from 'iii-sdk'

let client: IIIClient | null = null

/** Lazy singleton IIIClient. Connection is established on first access. */
export function getIIIClient(): IIIClient {
  if (!client) {
    client = registerWorker(process.env.III_URL ?? 'ws://localhost:49134', {
      workerName: 'veritio-backend',
      workerDescription: 'Veritio UX research platform backend (API steps, events, cron)',
      // Longest handler budget: process-transcription runs up to 300s.
      // HTTP requests are separately bounded by iii-http default_timeout.
      invocationTimeoutMs: 600_000,
      telemetry: { language: 'typescript', framework: 'veritio', project_name: 'veritio' },
    })
  }
  return client
}

/** Graceful shutdown — called from SIGTERM/SIGINT handlers in main.ts. */
export async function shutdownIIIClient(): Promise<void> {
  if (client && typeof (client as unknown as { shutdown?: () => Promise<void> }).shutdown === 'function') {
    await (client as unknown as { shutdown: () => Promise<void> }).shutdown()
  }
  client = null
}

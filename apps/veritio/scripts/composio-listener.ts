/**
 * Composio Dev Trigger Listener
 *
 * Uses Composio SDK's triggers.subscribe() (Pusher-based) to receive trigger
 * events locally without needing a public webhook URL.
 *
 * Events are forwarded to the local Motia backend webhook endpoint so the full
 * pipeline runs: handleWebhookEvent → emit → process-trigger-event.step → routeTriggerEvent
 *
 * IMPORTANT: Must run under Node.js (npx tsx), NOT Bun.
 * Bun's WebSocket implementation is incompatible with pusher-js — Pusher goes
 * connecting → unavailable instead of connecting → connected.
 *
 * Usage: cd apps/veritio && export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/composio-listener.ts
 */

import { getComposioClient } from '../src/services/composio/index'

const WEBHOOK_URL = 'http://localhost:4000/api/integrations/composio/webhook'

async function main() {
  const client = getComposioClient()

  // List active triggers to confirm there are triggers to listen for
  try {
    await client.triggers.getActiveTriggers()
  } catch {
    // Non-critical — just informational
  }

  await client.triggers.subscribe(async (data) => {
    const triggerId = data.metadata?.id ?? data.id
    const triggerSlug = data.triggerSlug ?? 'unknown'


    // Transform subscribe payload into the format handleWebhookEvent expects:
    // { triggerId, type, ...payload }
    const webhookBody = {
      triggerId,
      type: triggerSlug,
      ...(data.payload ?? {}),
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        console.error(`[composio-listener] Backend returned ${res.status}: ${body}`)
      }
    } catch (err) {
      console.error(`[composio-listener] Failed to forward to backend:`, err)
    }
  })

  // Monitor Pusher connection state to detect silent failures
  try {
    const pusherService = (client.triggers as any).pusherService
    const pusherClient = pusherService?.pusherClient
    if (pusherClient) {
      const state = pusherClient.connection?.state
      if (state === 'unavailable' || state === 'failed') {
        console.error('[composio-listener] Pusher connection failed — are you running under Node.js (not Bun)?')
      }

      pusherClient.connection.bind('state_change', (states: any) => {
        if (states.current === 'unavailable' || states.current === 'failed') {
          console.error('[composio-listener] Pusher connection lost — trigger events will not be received')
        }
      })
    }
  } catch {
    // Non-critical debug probe
  }
}

// Graceful shutdown
const shutdown = async () => {
  try {
    const client = getComposioClient()
    await client.triggers.unsubscribe()
  } catch {
    // best-effort
  }
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

main().catch((err) => {
  console.error('[composio-listener] Fatal error:', err)
  process.exit(1)
})

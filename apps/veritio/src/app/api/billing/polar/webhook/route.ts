import 'server-only'

import { Webhooks } from '@polar-sh/nextjs'
import { handlePolarEvent, type PolarEvent } from '@/services/billing/polar-billing-service'

// Polar signs with Standard Webhooks (svix) over the raw body, so this must be a
// Next.js route handler (raw bytes), NOT a Motia step. The /api/billing/* path is
// excluded from the Motia proxy in next.config.ts for this reason.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const secret = process.env.POLAR_WEBHOOK_SECRET

export const POST = secret
  ? Webhooks({
      webhookSecret: secret,
      onPayload: async (payload) => {
        await handlePolarEvent(payload as unknown as PolarEvent)
      },
    })
  : async () => {
      console.error('[polar] POLAR_WEBHOOK_SECRET not set; webhook rejected')
      return new Response(JSON.stringify({ error: 'Billing webhook not configured' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })
    }

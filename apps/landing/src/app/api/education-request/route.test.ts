/**
 * Education access request intake.
 *
 * A public unauthenticated endpoint, so the security-relevant behaviour is
 * pinned down here: validation, the honeypot, the rate limit, and the escaping
 * rules for the two places untrusted input lands (HTML body vs plain-text
 * subject). The punctuation case is not incidental — an over-broad control
 * character range once silently ate commas and ampersands out of subjects.
 *
 * Run with `bun run test` from apps/landing (vitest, matching apps/veritio).
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { EDUCATION_REQUEST_HONEYPOT_FIELD } from '../../../lib/education-request-contract'
import { POST } from './route'

const VALID = {
  name: 'Priya Raman',
  email: 'p.raman@university.edu',
  institution: 'National Institute of Design',
  programme: 'M.Des / Master of Design',
  course: 'Design Research Methods',
  cohort: '38',
  term: 'January 2027',
  tier: 'Classroom, one course',
  notes: 'Procurement needs a PO.',
}

let ipCounter = 0

/** Each call gets a fresh IP unless pinned, so the rate limiter stays out of the way. */
function post(body: unknown, ip?: string) {
  return POST(
    new Request('http://localhost/api/education-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': ip ?? `10.0.${++ipCounter}.1`,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

/** Payload of the most recent intercepted Resend call. */
let lastPayload: any = {}

/** Send a lead and return the payload Resend would have received. */
async function capturePayload(patch: Record<string, string>) {
  lastPayload = {}
  const res = await post({ ...VALID, ...patch })
  return { status: res.status, payload: lastPayload }
}

const originalKey = process.env.RESEND_API_KEY
const realFetch = globalThis.fetch

/** Set per-test: how the stubbed network should behave. */
let persistOk = true
let sendOk = true
let persistCalls = 0

beforeEach(() => {
  // Resend rejects keys that are not `re_`-shaped before it ever calls out.
  process.env.RESEND_API_KEY = 're_test_key'
  // Persistence is off unless a test opts in, matching a deployment that has
  // not configured Supabase on the landing project.
  delete process.env.SUPABASE_URL
  delete process.env.SUPABASE_ANON_KEY
  lastPayload = {}
  persistOk = true
  sendOk = true
  persistCalls = 0
  // Stub the network for every test, so nothing in this suite leaves the machine.
  globalThis.fetch = (async (url: any, init: any) => {
    const href = String(url)
    if (href.includes('education_access_requests')) {
      persistCalls += 1
      return new Response('', { status: persistOk ? 201 : 500 })
    }
    // Resend
    lastPayload = JSON.parse(init?.body ?? '{}')
    return sendOk
      ? new Response(JSON.stringify({ id: 'test' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      : new Response(JSON.stringify({ message: 'boom' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
})

/** Point the route at a Supabase that accepts inserts. */
function enablePersistence() {
  process.env.SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'anon-test-key'
}

afterEach(() => {
  globalThis.fetch = realFetch
  if (originalKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = originalKey
})

describe('POST /api/education-request', () => {
  it('rejects missing required fields', async () => {
    for (const field of ['name', 'email', 'institution', 'course', 'cohort', 'term', 'tier']) {
      const res = await post({ ...VALID, [field]: '' })
      expect(res.status).toBe(400)
    }
  })

  it('rejects a malformed email', async () => {
    expect((await post({ ...VALID, email: 'not-an-email' })).status).toBe(400)
  })

  it('rejects over-long values instead of forwarding them', async () => {
    expect((await post({ ...VALID, notes: 'x'.repeat(2001) })).status).toBe(400)
    expect((await post({ ...VALID, institution: 'x'.repeat(201) })).status).toBe(400)
  })

  it('handles malformed JSON without throwing', async () => {
    expect((await post('{not json')).status).toBe(400)
  })

  it('accepts a valid lead', async () => {
    const res = await post(VALID)
    const status = res.status
    expect(status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      delivered: true,
      stored: false,
      messageId: 'test',
    })
  })

  it('absorbs honeypot submissions without issuing a delivery receipt', async () => {
    const res = await post({
      ...VALID,
      [EDUCATION_REQUEST_HONEYPOT_FIELD]: 'filled by a bot',
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(lastPayload).toEqual({})
  })

  it('does not mistake a legacy browser-autofilled company field for a bot', async () => {
    const res = await post({ ...VALID, company: 'Autofilled organization' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      delivered: true,
      stored: false,
      messageId: 'test',
    })
  })

  it('fails the request when the lead is genuinely lost (no mail, no storage)', async () => {
    delete process.env.RESEND_API_KEY
    expect((await post(VALID)).status).toBe(502)
  })

  it('reports success when mail fails but the lead was stored', async () => {
    // A 502 here would push the visitor to the mailto: fallback and duplicate a
    // request already held.
    enablePersistence()
    sendOk = false

    const res = await post(VALID)

    expect(res.status).toBe(200)
    expect(persistCalls).toBe(1)
  })

  it('stores the lead alongside the email on the happy path', async () => {
    enablePersistence()

    const res = await post(VALID)

    expect(res.status).toBe(200)
    expect(persistCalls).toBe(1)
  })

  it('still succeeds when storage is unavailable but the email goes out', async () => {
    enablePersistence()
    persistOk = false

    expect((await post(VALID)).status).toBe(200)
  })

  it('does not store honeypot submissions', async () => {
    enablePersistence()

    await post({ ...VALID, [EDUCATION_REQUEST_HONEYPOT_FIELD]: 'filled by a bot' })

    expect(persistCalls).toBe(0)
  })

  it('fails when the provider does not issue a delivery identifier', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch

    expect((await post(VALID)).status).toBe(502)
  })

  it('rate limits per IP', async () => {
    const ip = '10.99.99.99'
    const codes: number[] = []
    for (let i = 0; i < 7; i++) codes.push((await post(VALID, ip)).status)
    expect(codes.filter((c) => c === 429)).toHaveLength(2)
  })

  it('escapes HTML in the email body', async () => {
    const { payload } = await capturePayload({ institution: '<script>alert(1)</script>' })
    expect(payload.html).toContain('&lt;script&gt;')
    expect(payload.html).not.toContain('<script>')
  })

  it('leaves the subject as plain text rather than double-escaping it', async () => {
    const { payload } = await capturePayload({ institution: '<script>alert(1)</script>' })
    expect(payload.subject).not.toContain('&lt;')
  })

  it('strips CRLF from the subject so headers cannot be injected', async () => {
    const { payload } = await capturePayload({ institution: 'NID\r\nBcc: attacker@evil.com' })
    expect(payload.subject).not.toMatch(/[\r\n]/)
  })

  it('keeps ordinary punctuation in the subject', async () => {
    const institution = 'Srishti, Institute of Art & Design'
    const { payload } = await capturePayload({ institution })
    expect(payload.subject).toContain(institution)
  })

  it('routes the lead to the inbox with reply-to set to the requester', async () => {
    const { payload } = await capturePayload({})
    expect(JSON.stringify(payload.to)).toContain('support@veritio.io')
    expect(payload.reply_to ?? payload.replyTo).toContain(VALID.email)
  })
})

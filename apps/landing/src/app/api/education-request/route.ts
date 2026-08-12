import { NextResponse } from 'next/server'
import { Resend } from 'resend'

/**
 * Education access request intake (POST from /education).
 *
 * A public, unauthenticated endpoint, so it is written defensively: fields are
 * validated and length-capped server-side, a honeypot catches naive bots, and a
 * per-IP rate limit blunts the rest. Every value is HTML-escaped before it goes
 * anywhere near the email body.
 *
 * The lead is emailed to the education inbox with reply-to set to the requester,
 * so answering is one click. PostHog also records `education_access_request`
 * client-side, which means every lead exists in two independent places.
 */

// Mirrors src/lib/email/from-address.ts in apps/veritio. Keep the default in sync.
const FROM_EMAIL = process.env.EMAIL_FROM || 'Veritio <noreply@veritio.io>'
const INBOX = process.env.EDU_REQUEST_INBOX || 'support@veritio.io'

/** name -> [label, required, maxLength] */
const FIELDS: Array<[string, string, boolean, number]> = [
  ['name', 'Full name', true, 120],
  ['email', 'Institutional email', true, 200],
  ['institution', 'Institution', true, 200],
  ['programme', 'Programme', true, 80],
  ['course', 'Course or module', true, 200],
  ['cohort', 'Cohort size', true, 10],
  ['term', 'Term starts', true, 60],
  ['tier', 'Access that fits', true, 80],
  ['notes', 'Anything else', false, 2000],
]

// Deliberately loose: the point is to reject obvious junk, not to adjudicate
// what a valid address looks like. A human reads this reply.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Per-IP limiter. In-memory, so on serverless it only covers a single warm
 * instance — enough to stop a naive loop, not a distributed flood. The honeypot
 * and Resend's own limits carry the rest; a shared store would be the upgrade
 * if this ever attracts real abuse.
 */
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear() // crude unbounded-growth guard
  return false
}

/**
 * Subjects are plain text, so they are not HTML-escaped (that would show the
 * reader `&lt;script&gt;`). They are stripped of CR/LF and other control
 * characters, which is the shape header injection takes.
 */
function subjectSafe(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Store the lead so it survives a mail failure.
 *
 * Uses the anon key server-side (deliberately not NEXT_PUBLIC_, so it never
 * reaches the client bundle) against a table whose RLS grants INSERT only.
 * A leaked key could add junk rows but could not read a single lead.
 *
 * Never throws: the email is the operative notification, and losing the
 * durable copy must not turn a delivered lead into a 502 for the visitor.
 */
async function persistLead(clean: Record<string, string>): Promise<boolean> {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) return false

  const cohortSize = Number.parseInt(clean.cohort, 10)
  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/education_access_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: clean.name,
        email: clean.email,
        institution: clean.institution,
        programme: clean.programme || null,
        course: clean.course || null,
        cohort_size: Number.isFinite(cohortSize) ? cohortSize : null,
        term_starts: clean.term || null,
        tier: clean.tier || null,
        notes: clean.notes || null,
      }),
    })
    if (!res.ok) {
      console.error('[education-request] persist failed', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (error) {
    console.error('[education-request] persist threw', error)
    return false
  }
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please email us directly.' },
      { status: 429 },
    )
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Honeypot: a field hidden from humans. Anything that fills it is a bot, and
  // gets a 200 so it has no signal to retry against.
  if (typeof payload.company === 'string' && payload.company.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const clean: Record<string, string> = {}
  for (const [key, label, required, max] of FIELDS) {
    const raw = payload[key]
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (required && !value) {
      return NextResponse.json({ error: `${label} is required.` }, { status: 400 })
    }
    if (value.length > max) {
      return NextResponse.json({ error: `${label} is too long.` }, { status: 400 })
    }
    clean[key] = value
  }

  if (!EMAIL_RE.test(clean.email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY

  const rows = FIELDS.map(
    ([key, label]) =>
      `<tr>
         <td style="padding:6px 16px 6px 0;color:#6b6b6b;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
         <td style="padding:6px 0;color:#141414">${escapeHtml(clean[key] || '-')}</td>
       </tr>`,
  ).join('')

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 4px;font-size:16px">Education access request</h2>
      <p style="margin:0 0 16px;color:#6b6b6b">
        ${escapeHtml(clean.institution)} — cohort of ${escapeHtml(clean.cohort)}, ${escapeHtml(clean.term)}
      </p>
      <table style="border-collapse:collapse">${rows}</table>
    </div>`

  // Store before sending, so a mail outage cannot lose the lead entirely.
  const persisted = await persistLead(clean)

  let delivered = false
  if (!apiKey) {
    console.error('[education-request] RESEND_API_KEY is not set; cannot notify the inbox')
  } else {
    try {
      const resend = new Resend(apiKey)
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: INBOX,
        replyTo: clean.email,
        subject: subjectSafe(`Education access request: ${clean.institution}`),
        html,
      })
      if (error) throw new Error(error.message)
      delivered = true
    } catch (error) {
      console.error('[education-request] send failed', error)
    }
  }

  // Only fail the visitor when the lead is genuinely lost. If it is stored, a
  // 502 would send them to the mailto: fallback and duplicate a request we
  // already hold — so report success and page ops through the log instead.
  if (!delivered && !persisted) {
    return NextResponse.json({ error: 'Request could not be delivered.' }, { status: 502 })
  }
  if (!delivered) {
    console.error('[education-request] lead stored but not emailed; check the inbox integration', {
      institution: clean.institution,
    })
  }

  return NextResponse.json({ ok: true })
}

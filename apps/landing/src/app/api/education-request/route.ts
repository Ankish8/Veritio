import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { EDUCATION_REQUEST_HONEYPOT_FIELD } from '../../../lib/education-request-contract'

/**
 * Education access request intake (POST from /education).
 *
 * A public, unauthenticated endpoint, so it is written defensively: fields are
 * validated and length-capped server-side, a honeypot catches naive bots, and a
 * per-IP rate limit blunts the rest. Every value is HTML-escaped before it goes
 * anywhere near the email body.
 *
 * The lead is emailed to the education inbox with reply-to set to the requester,
 * so answering is one click. The client records the PostHog conversion only
 * after this route issues an explicit delivery receipt.
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

  // Honeypot: a field hidden from humans. Anything that fills it gets a 200 so
  // simple bots have no signal to retry, but deliberately no delivery receipt.
  // The client requires that receipt and therefore cannot mistake this branch
  // for a delivered human request.
  const honeypot = payload[EDUCATION_REQUEST_HONEYPOT_FIELD]
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    console.warn('[education-request] honeypot submission absorbed')
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
  if (!apiKey) {
    // Misconfigured deployment. Fail loudly rather than pretending the lead landed.
    console.error('[education-request] RESEND_API_KEY is not set; cannot deliver lead')
    return NextResponse.json({ error: 'Request could not be delivered.' }, { status: 500 })
  }

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

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: INBOX,
      replyTo: clean.email,
      subject: subjectSafe(`Education access request: ${clean.institution}`),
      html,
    })
    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Resend did not return a delivery identifier')
  } catch (error) {
    console.error('[education-request] send failed', error)
    return NextResponse.json({ error: 'Request could not be delivered.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, delivered: true })
}

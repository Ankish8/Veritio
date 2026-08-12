/**
 * The outbound-email dev guard.
 *
 * Local development points at the production Resend key and the production
 * Supabase database, so exercising a notification path emails real people —
 * which happened once already, to two colleagues, while testing @mentions.
 *
 * These tests pin both halves of the guard: it must suppress outside
 * production, and it must NOT suppress in production, since a guard that
 * silently disables real email would be worse than no guard.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

/** NODE_ENV is typed readonly, so assign through a mutable view. */
const env = process.env as Record<string, string | undefined>

async function loadSendEmail() {
  vi.resetModules()
  const mod = await import('../email-service')
  return mod.sendEmail
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  // Mutate rather than reassign. Replacing process.env wholesale detaches the
  // `env` reference captured above, so later writes would land on an orphaned
  // object while the service reads the new one — every test would then see the
  // suppressed path regardless of what it set.
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key]
  }
  Object.assign(process.env, ORIGINAL_ENV)
})

const MAIL = { to: 'someone@example.com', subject: 'Test', html: '<p>hi</p>' }

describe('outbound email dev guard', () => {
  it('suppresses in development when the flag is unset', async () => {
    env.NODE_ENV = 'development'
    delete env.EMAIL_SEND_ENABLED

    const sendEmail = await loadSendEmail()
    const result = await sendEmail(MAIL)

    expect(result.success).toBe(true)
    expect(result.id).toBe('suppressed-dev')
  })

  it('suppresses in test environments too', async () => {
    env.NODE_ENV = 'test'
    delete env.EMAIL_SEND_ENABLED

    const sendEmail = await loadSendEmail()
    expect((await sendEmail(MAIL)).id).toBe('suppressed-dev')
  })

  it('does not treat a non-"true" flag value as opt-in', async () => {
    env.NODE_ENV = 'development'
    env.EMAIL_SEND_ENABLED = '1'

    const sendEmail = await loadSendEmail()
    expect((await sendEmail(MAIL)).id).toBe('suppressed-dev')
  })

  it('reports success so callers still run their post-send paths', async () => {
    env.NODE_ENV = 'development'
    delete env.EMAIL_SEND_ENABLED

    const sendEmail = await loadSendEmail()
    const result = await sendEmail(MAIL)

    // check-notification-triggers only records a milestone as reached when the
    // send reports success; a `false` here would make dev runs drift from prod.
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('logs the suppressed recipient and subject so the path stays verifiable', async () => {
    env.NODE_ENV = 'development'
    delete env.EMAIL_SEND_ENABLED
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const sendEmail = await loadSendEmail()
    await sendEmail(MAIL)

    const logged = warn.mock.calls.flat().join(' ')
    expect(logged).toContain('someone@example.com')
    expect(logged).toContain('Test')
  })

  it('does NOT suppress on a production host, with no flag required', async () => {
    // Uses the platform marker rather than NODE_ENV: bundlers inline
    // process.env.NODE_ENV at build time, so it cannot be trusted at runtime.
    env.RAILWAY_ENVIRONMENT = 'production'
    delete env.EMAIL_SEND_ENABLED
    delete env.RESEND_API_KEY

    const sendEmail = await loadSendEmail()
    const result = await sendEmail(MAIL)

    // Falls through to the real send path, which fails here only because no
    // API key is configured — proving the guard let it through.
    expect(result.id).not.toBe('suppressed-dev')
    expect(result.error).toMatch(/not configured/i)
  })

  it('suppresses on a non-production host even with a platform marker present', async () => {
    env.RAILWAY_ENVIRONMENT = 'staging'
    delete env.EMAIL_SEND_ENABLED

    const sendEmail = await loadSendEmail()
    expect((await sendEmail(MAIL)).id).toBe('suppressed-dev')
  })

  it('sends in development once explicitly opted in', async () => {
    env.NODE_ENV = 'development'
    env.EMAIL_SEND_ENABLED = 'true'
    delete env.RESEND_API_KEY

    const sendEmail = await loadSendEmail()
    const result = await sendEmail(MAIL)

    expect(result.id).not.toBe('suppressed-dev')
  })
})

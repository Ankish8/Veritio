'use client'

import { useState } from 'react'
import posthog from 'posthog-js'
import ArrowIcon from '@/components/ArrowIcon'

/**
 * Education access request form.
 *
 * Posts to the app's own intake route, which emails the education inbox with
 * reply-to set to the requester. NEXT_PUBLIC_EDU_FORM_ENDPOINT overrides the
 * target for deployments that would rather point at a CRM or catch hook.
 *
 * If the request fails the visitor is offered the same answers as a prefilled
 * mailto:, so a bad deploy or a dropped connection never costs a lead. The
 * submission is also mirrored to PostHog as `education_access_request`, which
 * means every lead exists in two independent places.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_EDU_FORM_ENDPOINT || '/api/education-request'
const INBOX = 'support@veritio.io'

const TIERS = [
  'Classroom, one course',
  'Department, several courses',
  'Campus, whole institution',
  'Not sure yet',
] as const

const PROGRAMMES = [
  'M.Des / Master of Design',
  'B.Des / Bachelor of Design',
  'HCI or Computer Science',
  'Business or Marketing',
  'Continuing education',
  'Other',
] as const

type Status = 'idle' | 'sending' | 'sent' | 'error'

/** Structured mailto: used as the escape hatch when the endpoint is unreachable. */
function mailtoFor(entries: Record<string, string>): string {
  const body = Object.entries(FIELD_LABELS)
    .map(([key, label]) => `${label}: ${entries[key] || '-'}`)
    .join('\n')
  const subject = `Education access request: ${entries.institution || 'Veritio'}`
  return `mailto:${INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Full name',
  email: 'Institutional email',
  institution: 'Institution',
  programme: 'Programme',
  course: 'Course or module',
  cohort: 'Cohort size',
  term: 'Term starts',
  tier: 'Access that fits',
  notes: 'Anything else',
}

export default function RequestAccessForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [fallbackHref, setFallbackHref] = useState('')

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const entries = Object.fromEntries(new FormData(form)) as Record<string, string>

    setStatus('sending')

    posthog.capture?.('education_access_request', {
      institution: entries.institution,
      programme: entries.programme,
      cohort: entries.cohort,
      tier: entries.tier,
    })

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `Request failed: ${res.status}`)
      }
      form.reset()
      setStatus('sent')
    } catch (error) {
      // Never a dead end: keep what they typed and offer it as a prefilled email.
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong.')
      setFallbackHref(mailtoFor(entries))
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="edu-form edu-form-done" role="status">
        <div className="edu-form-done-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h3>Request received</h3>
        <p>
          We reply within one working day with a quote for your cohort, the
          invoice or purchase order form, and a provisioning date. If you need
          to add anything, write to {INBOX}.
        </p>
        <button type="button" className="edu-form-reset" onClick={() => setStatus('idle')}>
          Submit another course
        </button>
      </div>
    )
  }

  return (
    <form className="edu-form" onSubmit={onSubmit} noValidate={false}>
      <div className="edu-form-grid">
        <label className="edu-field">
          <span>Full name</span>
          <input name="name" type="text" autoComplete="name" required placeholder="Priya Raman" />
        </label>

        <label className="edu-field">
          <span>Institutional email</span>
          <input name="email" type="email" autoComplete="email" required placeholder="p.raman@university.edu" />
        </label>

        <label className="edu-field edu-field-wide">
          <span>Institution</span>
          <input name="institution" type="text" required placeholder="National Institute of Design" />
        </label>

        <label className="edu-field">
          <span>Programme</span>
          <select name="programme" required defaultValue="">
            <option value="" disabled>
              Select a programme
            </option>
            {PROGRAMMES.map((programme) => (
              <option key={programme} value={programme}>
                {programme}
              </option>
            ))}
          </select>
        </label>

        <label className="edu-field">
          <span>Course or module</span>
          <input name="course" type="text" required placeholder="Design Research Methods" />
        </label>

        <label className="edu-field">
          <span>Cohort size</span>
          <input name="cohort" type="number" min={1} max={5000} required placeholder="38" />
        </label>

        {/* Plain text rather than type="month": the native month widget renders
            an unstyled picker button and a "--------, ----" empty state that
            reads as broken, and a human reads this reply anyway. */}
        <label className="edu-field">
          <span>Term starts</span>
          <input name="term" type="text" required placeholder="January 2027" />
        </label>

        <label className="edu-field edu-field-wide">
          <span>Access that fits</span>
          <select name="tier" required defaultValue="">
            <option value="" disabled>
              Select the closest match
            </option>
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>

        <label className="edu-field edu-field-wide">
          <span>
            Anything else <em>optional</em>
          </span>
          <textarea
            name="notes"
            rows={3}
            placeholder="Procurement requirements, self-hosting questions, or the methods you plan to teach."
          />
        </label>
      </div>

      {/* Honeypot: hidden from people, irresistible to naive bots. */}
      <div className="edu-form-hp" aria-hidden="true">
        <label>
          Company
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {status === 'error' && (
        <p className="edu-form-error" role="alert">
          {errorMessage} Your answers are still here:{' '}
          <a href={fallbackHref}>send them to {INBOX} instead</a> and we will pick
          it up from there.
        </p>
      )}

      <button className="edu-form-submit" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending' : 'Request access'} <ArrowIcon />
      </button>

      <p className="edu-form-fine">
        We use these details to verify the programme and provision accounts.
        Nothing here is shared outside Veritio.
      </p>
    </form>
  )
}

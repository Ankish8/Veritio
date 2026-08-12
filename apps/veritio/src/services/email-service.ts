import { Resend } from 'resend'
import { consumeRateLimit, rewardRateLimit } from '@/middlewares/rate-limit/rate-limiter'
import { resolveFromEmail } from '@/lib/email/from-address'

// Lazy-load Resend client to avoid errors during module compilation
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Canonical sender for all outbound Veritio email, in "Name <address>" format.
const FROM_EMAIL = resolveFromEmail()

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  studyId?: string // For rate limiting
}

export interface EmailResult {
  success: boolean
  id?: string
  error?: string
  rateLimited?: boolean
}

/**
 * A rate-limiter rejection is a RateLimiterRes object (not an Error) carrying
 * msBeforeNext; distinguish it from an actual limiter/Redis outage.
 */
function isRateLimitRejection(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'msBeforeNext' in err
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, studyId } = options

  // Reserve a slot up front (atomic check-and-increment, Redis-backed and
  // shared across instances). The point is refunded below if the send fails.
  if (studyId) {
    try {
      await consumeRateLimit('email', studyId)
    } catch (err) {
      if (isRateLimitRejection(err)) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          rateLimited: true,
        }
      }
      // Limiter/Redis outage: don't block the send on it.
      console.error('[email] rate limiter error, allowing send:', err)
    }
  }

  try {
    const resend = getResendClient()
    if (!resend) {
      if (studyId) await rewardRateLimit('email', studyId)
      return {
        success: false,
        error: 'Email service not configured (missing RESEND_API_KEY)',
      }
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    })

    if (error) {
      if (studyId) await rewardRateLimit('email', studyId)
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
      id: data?.id,
    }
  } catch (error) {
    if (studyId) await rewardRateLimit('email', studyId)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function sendBatchEmails(
  emails: Array<{ to: string; subject: string; html: string }>
): Promise<{ success: boolean; results: EmailResult[] }> {
  const results: EmailResult[] = []

  for (const email of emails) {
    const result = await sendEmail(email)
    results.push(result)
  }

  return {
    success: results.every((r) => r.success),
    results,
  }
}

export function wrapInEmailLayout(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .footer {
      border-top: 1px solid #eee;
      padding-top: 20px;
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
    .button {
      display: inline-block;
      background: #000;
      color: #fff !important;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 16px 0;
    }
    .stat-box {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .stat-number {
      font-size: 32px;
      font-weight: bold;
      color: #000;
    }
    .milestone-badge {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <strong>Veritio</strong>
  </div>
  ${content}
  <div class="footer">
    <p>You're receiving this because you enabled email notifications for your study.</p>
    <p>Veritio - UX Research Made Simple</p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Escape a string for safe interpolation into email HTML.
 *
 * Comment bodies and author names are free-form input written by one user and
 * delivered to another, so they cannot go into a template raw.
 *
 * NOTE: the older generators below interpolate `studyTitle` unescaped. That is
 * a narrower exposure (a study's own title, emailed to its owner) and is left
 * alone here rather than widened into an unrelated refactor, but it should be
 * cleaned up.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Email for "someone @mentioned you" and "someone replied in your thread".
 *
 * Deliberately shows a preview rather than the full comment: enough to decide
 * whether to click, without turning email into a mirror of the discussion.
 */
export function generateCommentMentionEmail(params: {
  authorName: string
  studyTitle: string
  preview: string
  commentUrl: string
  reason: 'mention' | 'reply'
}): string {
  const { authorName, studyTitle, preview, commentUrl, reason } = params

  const headline =
    reason === 'mention'
      ? `${escapeHtml(authorName)} mentioned you`
      : `${escapeHtml(authorName)} replied to your thread`

  const content = `
    <h2>${headline}</h2>
    <p>In <strong>${escapeHtml(studyTitle)}</strong>:</p>
    <blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #e4e4e7; background: #fafafa; color: #3f3f46;">
      ${escapeHtml(preview)}
    </blockquote>
    <p>
      <a href="${commentUrl}" class="button">View comment</a>
    </p>
  `

  const subject =
    reason === 'mention'
      ? `${authorName} mentioned you in ${studyTitle}`
      : `${authorName} replied in ${studyTitle}`

  return wrapInEmailLayout(content, subject)
}

export function generateResponseReceivedEmail(
  studyTitle: string,
  participantNumber: number,
  studyUrl: string
): string {
  const content = `
    <h2>New Response Received!</h2>
    <p>Your study "<strong>${studyTitle}</strong>" just received a new response.</p>
    <div class="stat-box">
      <div class="stat-number">#${participantNumber}</div>
      <div>Response</div>
    </div>
    <p>
      <a href="${studyUrl}" class="button">View Results</a>
    </p>
  `
  return wrapInEmailLayout(content, `New Response - ${studyTitle}`)
}

export function generateMilestoneEmail(
  studyTitle: string,
  milestone: number,
  studyUrl: string
): string {
  const content = `
    <h2>Milestone Reached!</h2>
    <p>Your study "<strong>${studyTitle}</strong>" has reached a milestone.</p>
    <div style="text-align: center; margin: 24px 0;">
      <span class="milestone-badge">${milestone} Responses</span>
    </div>
    <p>Congratulations on reaching ${milestone} responses! Your research is making great progress.</p>
    <p>
      <a href="${studyUrl}" class="button">View Results</a>
    </p>
  `
  return wrapInEmailLayout(content, `Milestone: ${milestone} Responses - ${studyTitle}`)
}

export function generateDailyDigestEmail(
  studies: Array<{ title: string; newResponses: number; totalResponses: number; url: string }>
): string {
  const studyRows = studies
    .map(
      (s) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${s.title}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          +${s.newResponses}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
          ${s.totalResponses}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <a href="${s.url}">View</a>
        </td>
      </tr>
    `
    )
    .join('')

  const totalNew = studies.reduce((sum, s) => sum + s.newResponses, 0)

  const content = `
    <h2>Daily Digest</h2>
    <p>Here's a summary of activity across your studies in the last 24 hours.</p>
    <div class="stat-box">
      <div class="stat-number">+${totalNew}</div>
      <div>New responses today</div>
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 12px; text-align: left;">Study</th>
          <th style="padding: 12px; text-align: center;">New</th>
          <th style="padding: 12px; text-align: center;">Total</th>
          <th style="padding: 12px;"></th>
        </tr>
      </thead>
      <tbody>
        ${studyRows}
      </tbody>
    </table>
  `
  return wrapInEmailLayout(content, 'Daily Digest - Veritio')
}

export function generateStudyClosedEmail(
  studyTitle: string,
  reason: 'manual' | 'date' | 'participant_limit' | 'both',
  totalResponses: number,
  studyUrl: string
): string {
  const reasonText = {
    manual: 'You manually closed the study.',
    date: 'The study reached its scheduled close date.',
    participant_limit: 'The study reached its participant limit.',
    both: 'The study reached its scheduled date or participant limit.',
  }[reason]

  const content = `
    <h2>Study Closed</h2>
    <p>Your study "<strong>${studyTitle}</strong>" has been closed.</p>
    <p>${reasonText}</p>
    <div class="stat-box">
      <div class="stat-number">${totalResponses}</div>
      <div>Total responses collected</div>
    </div>
    <p>
      <a href="${studyUrl}" class="button">View Final Results</a>
    </p>
  `
  return wrapInEmailLayout(content, `Study Closed - ${studyTitle}`)
}

/**
 * Notice that an education license is approaching its end date.
 *
 * Deliberately has no upgrade or checkout link: these licenses are invoiced
 * against a purchase order, and pointing an institution at self-serve billing
 * would overwrite their plan and collapse the cohort's seats. The action is to
 * reply to a human, with enough lead time for a finance office to raise a PO.
 */
export function generateTermExpiryEmail(
  organizationName: string,
  endsAt: string,
  daysLeft: number,
  isFinalNotice: boolean
): string {
  const endDate = new Date(endsAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const dayText = daysLeft === 1 ? '1 day' : `${daysLeft} days`
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://veritio.io').replace(/\/+$/, '')

  const content = `
    <h2>${isFinalNotice ? 'Your access period ends soon' : 'Your access period is coming up for renewal'}</h2>
    <p>
      The Veritio education license for <strong>${organizationName}</strong> ends on
      <strong>${endDate}</strong>, in ${dayText}.
    </p>
    <div class="stat-box">
      <div class="stat-number">${daysLeft}</div>
      <div>${daysLeft === 1 ? 'day' : 'days'} of access remaining</div>
    </div>
    <p>
      After that date, studies and results stay readable but no new studies can be
      launched and no further responses are collected. Nothing is deleted.
    </p>
    <p>
      To extend the term or change the cohort size, reply to this email or write to
      <a href="mailto:support@veritio.io">support@veritio.io</a> and we will issue an
      invoice or work to your purchase order.
    </p>
    <p>
      <a href="${appUrl}/settings?tab=plan-usage" class="button">View your license</a>
    </p>
  `
  return wrapInEmailLayout(
    content,
    `${isFinalNotice ? 'Final notice' : 'Renewal notice'} - Veritio access for ${organizationName}`
  )
}

import { Resend } from 'resend'

// Lazy-load Resend client to avoid errors during module compilation
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'notifications@veritio.io'
const FROM_NAME = 'Veritio'

// Rate limiting: max emails per hour per study
const MAX_EMAILS_PER_HOUR = 10

// In-memory rate limit tracking (per-study)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

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

function checkRateLimit(studyId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const limit = rateLimitMap.get(studyId)

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(studyId, { count: 0, resetAt: now + 60 * 60 * 1000 }) // 1 hour
    return { allowed: true, remaining: MAX_EMAILS_PER_HOUR }
  }

  if (limit.count < MAX_EMAILS_PER_HOUR) {
    return { allowed: true, remaining: MAX_EMAILS_PER_HOUR - limit.count }
  }

  return { allowed: false, remaining: 0 }
}

function incrementRateLimit(studyId: string): void {
  const limit = rateLimitMap.get(studyId)
  if (limit) {
    limit.count++
  }
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, studyId } = options

  if (studyId) {
    const { allowed } = checkRateLimit(studyId)
    if (!allowed) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        rateLimited: true,
      }
    }
  }

  try {
    const resend = getResendClient()
    if (!resend) {
      return {
        success: false,
        error: 'Email service not configured (missing RESEND_API_KEY)',
      }
    }

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_ADDRESS}>`,
      to: [to],
      subject,
      html,
    })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    if (studyId) {
      incrementRateLimit(studyId)
    }

    return {
      success: true,
      id: data?.id,
    }
  } catch (error) {
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

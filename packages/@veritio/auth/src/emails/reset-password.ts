/**
 * Password reset email template — plain, text-forward design.
 * Mirrors verify-email.ts. No gradients, no heavy imagery.
 */

export function resetPasswordHtml({
  url,
  userName,
}: {
  url: string
  userName: string | null
}) {
  const greeting = userName ? `Hi ${userName},` : "Hi,"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0; padding:0; background-color:#fafafa; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; background-color:#ffffff; border:1px solid #e5e5e5; border-radius:8px;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0 32px;">
              <span style="font-size:18px; font-weight:600; color:#18181b; letter-spacing:-0.3px;">Veritio</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 32px 0 32px;">
              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#18181b;">
                ${greeting}
              </p>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#3f3f46;">
                We received a request to reset your Veritio password. Click the button below to choose a new one. This link expires in 1 hour.
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td style="padding:0 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:6px; background-color:#18181b;">
                    <a href="${url}" target="_blank" style="display:inline-block; padding:10px 24px; font-size:14px; font-weight:500; color:#ffffff; text-decoration:none; border-radius:6px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:20px 32px 0 32px;">
              <p style="margin:0; font-size:13px; line-height:1.5; color:#a1a1aa;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:6px 0 0 0; font-size:13px; line-height:1.5; word-break:break-all;">
                <a href="${url}" style="color:#71717a; text-decoration:underline;">${url}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 32px 32px 32px;">
              <hr style="border:none; border-top:1px solid #e5e5e5; margin:0 0 20px 0;" />
              <p style="margin:0; font-size:12px; line-height:1.5; color:#a1a1aa;">
                You received this email because a password reset was requested for this address on Veritio. If you didn't request this, you can safely ignore this email and your password will stay the same.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

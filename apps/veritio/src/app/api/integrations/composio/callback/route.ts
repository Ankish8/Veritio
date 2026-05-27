import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { saveComposioConnection, toolkitDisplayName } from '@/services/composio'

const querySchema = z.object({
  userId: z.string().min(1),
  toolkit: z.string().min(1),
  connected_account_id: z.string().optional(),
  returnUrl: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return val
      if (val.startsWith('/') && !val.startsWith('//')) return val
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'
      try {
        const url = new URL(val)
        if (url.origin === new URL(appUrl).origin) return val
      } catch {
        /* not a valid absolute URL */
      }
      return undefined
    }),
})

function htmlResponse(status: number, body: string) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function renderHtml(type: 'success' | 'error', message: string, returnUrl?: string): string {
  const isSuccess = type === 'success'
  const title = isSuccess ? `Connected to ${message}` : 'Connection Failed'
  const icon = isSuccess ? '&#10003;' : '&#10005;'
  const gradient = isSuccess
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'

  const redirectScript = isSuccess
    ? `
    var el = document.getElementById('return-data');
    var returnUrl = decodeURIComponent(el && el.getAttribute('data-return-url') || '') || sessionStorage.getItem('composio_oauth_return_url');
    if (returnUrl) {
      try {
        var url = new URL(returnUrl, window.location.origin);
        if (url.origin !== window.location.origin) { returnUrl = '/'; }
      } catch(e) {
        if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) { returnUrl = '/'; }
      }
      sessionStorage.removeItem('composio_oauth_return_url');
      document.getElementById('status').textContent = 'Redirecting back...';
      setTimeout(function() { window.location.href = returnUrl; }, 1000);
    } else {
      setTimeout(function() {
        window.close();
        document.getElementById('status').textContent = 'Please close this tab to continue.';
      }, 1500);
    }
  `
    : `setTimeout(function() { window.close(); }, 3000);`

  return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: ${gradient};
      color: white;
    }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { opacity: 0.9; margin: 0; }
  </style>
</head>
<body>
  <div id="return-data" data-return-url="${encodeURIComponent(returnUrl || '')}"></div>
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}${isSuccess ? '!' : ''}</h1>
    <p id="status">${isSuccess ? 'You can close this window now.' : message}</p>
  </div>
  <script>(function() { ${redirectScript} })();</script>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const query = querySchema.safeParse(params)

  if (!query.success) {
    return htmlResponse(400, renderHtml('error', 'Invalid request. Please try again.'))
  }

  const { userId, toolkit, connected_account_id, returnUrl } = query.data

  if (!connected_account_id) {
    return htmlResponse(
      400,
      renderHtml('error', 'Connection failed — no account ID received. Please try again.', returnUrl),
    )
  }

  try {
    const supabase = getMotiaSupabaseClient()
    const { error: saveError } = await saveComposioConnection(
      supabase,
      userId,
      toolkit,
      connected_account_id,
      null,
    )

    if (saveError) {
      return htmlResponse(
        500,
        renderHtml('error', 'Failed to save connection. Please try again.', returnUrl),
      )
    }

    return htmlResponse(200, renderHtml('success', toolkitDisplayName(toolkit), returnUrl))
  } catch {
    return htmlResponse(
      500,
      renderHtml('error', 'An unexpected error occurred. Please try again.', returnUrl),
    )
  }
}

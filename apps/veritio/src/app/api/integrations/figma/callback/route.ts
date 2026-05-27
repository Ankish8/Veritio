import { NextRequest } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import {
  exchangeCodeForToken,
  getFigmaUser,
  saveFigmaConnection,
} from '@/services/figma/figma-oauth'

const querySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

function htmlResponse(status: number, body: string) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function errorHtml(message: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Connection Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }
    .container { text-align: center; padding: 2rem; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { opacity: 0.9; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10005;</div>
    <h1>Connection Failed</h1>
    <p>${message}</p>
  </div>
  <script>
    setTimeout(function() { window.close(); }, 3000);
  </script>
</body>
</html>`
}

const SUCCESS_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Figma Connected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container { text-align: center; padding: 2rem; }
    .checkmark { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { opacity: 0.9; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">&#10003;</div>
    <h1>Connected to Figma!</h1>
    <p id="status">Redirecting...</p>
  </div>
  <script>
    (function() {
      var returnUrl = sessionStorage.getItem('figma_oauth_return_url');
      if (returnUrl) {
        try {
          var url = new URL(returnUrl, window.location.origin);
          if (url.origin !== window.location.origin) { returnUrl = '/'; }
        } catch (e) {
          if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) { returnUrl = '/'; }
        }
        sessionStorage.removeItem('figma_oauth_return_url');
        document.getElementById('status').textContent = 'Redirecting back...';
        setTimeout(function() { window.location.href = returnUrl; }, 1000);
      } else {
        document.getElementById('status').textContent = 'You can close this window now.';
        setTimeout(function() {
          window.close();
          document.getElementById('status').textContent = 'Please close this tab to continue.';
        }, 1500);
      }
    })();
  </script>
</body>
</html>`

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')

    const query = querySchema.safeParse({ code, state })
    if (!query.success) {
      return htmlResponse(400, errorHtml('Invalid request. Please try again.'))
    }

    const stateParts = query.data.state.split(':')
    if (stateParts.length !== 3) {
      return htmlResponse(400, errorHtml('Invalid session. Please try again.'))
    }

    const [userId, timestamp, receivedHmac] = stateParts

    const stateSecret = process.env.FIGMA_CLIENT_SECRET
    if (!stateSecret) {
      return htmlResponse(500, errorHtml('Server configuration error. Please contact support.'))
    }

    const expectedHmac = crypto
      .createHmac('sha256', stateSecret)
      .update(`${userId}:${timestamp}`)
      .digest('hex')

    const receivedBuf = Buffer.from(receivedHmac, 'hex')
    const expectedBuf = Buffer.from(expectedHmac, 'hex')
    if (
      receivedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(receivedBuf, expectedBuf)
    ) {
      return htmlResponse(403, errorHtml('Invalid session. Please try again.'))
    }

    const stateAge = Date.now() - parseInt(timestamp, 10)
    const maxAgeMs = 10 * 60 * 1000
    if (isNaN(stateAge) || stateAge < 0 || stateAge > maxAgeMs) {
      return htmlResponse(400, errorHtml('Session expired. Please try again.'))
    }

    const { data: tokenData, error: tokenError } = await exchangeCodeForToken(query.data.code)
    if (tokenError || !tokenData) {
      return htmlResponse(500, errorHtml('Failed to connect to Figma. Please try again.'))
    }

    const { data: userInfo, error: userError } = await getFigmaUser(tokenData.access_token)
    if (userError || !userInfo) {
      return htmlResponse(500, errorHtml('Failed to get your Figma account info.'))
    }

    const supabase = getMotiaSupabaseClient()
    const { error: saveError } = await saveFigmaConnection(supabase, userId, tokenData, userInfo)
    if (saveError) {
      return htmlResponse(500, errorHtml('Failed to save connection. Please try again.'))
    }

    return htmlResponse(200, SUCCESS_HTML)
  } catch {
    return htmlResponse(500, errorHtml('An unexpected error occurred. Please try again.'))
  }
}

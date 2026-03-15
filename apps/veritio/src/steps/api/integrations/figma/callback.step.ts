import type { StepConfig } from 'motia'
import { z } from 'zod'
import crypto from 'crypto'
// NOTE: 5 levels up to reach root /middlewares/ (not src/middlewares/ which is broken)
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import {
  exchangeCodeForToken,
  getFigmaUser,
  saveFigmaConnection,
} from '../../../../services/figma/figma-oauth'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'

export const config = {
  name: 'FigmaOAuthCallback',
  description: 'Handle Figma OAuth callback - exchanges code for token',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/figma/callback',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: ['figma-connected'],
  flows: ['auth'],
} satisfies StepConfig

// Query params from Figma redirect
const querySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  // Helper to generate error HTML
  const getErrorHtml = (message: string) => `
<!DOCTYPE html>
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
    .container {
      text-align: center;
      padding: 2rem;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { opacity: 0.9; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">✕</div>
    <h1>Connection Failed</h1>
    <p>${message}</p>
  </div>
  <script>
    setTimeout(function() { window.close(); }, 3000);
  </script>
</body>
</html>`

  try {
    // Parse query parameters
    const query = querySchema.safeParse(req.queryParams)
    if (!query.success) {
      logger.warn('Invalid OAuth callback parameters', { errors: query.error.issues })
      return {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHtml('Invalid request. Please try again.'),
      }
    }

    const { code, state } = query.data

    // Verify HMAC-signed state (format: userId:timestamp:hmac)
    const stateParts = state.split(':')
    if (stateParts.length !== 3) {
      logger.warn('Invalid state format in OAuth callback')
      return {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHtml('Invalid session. Please try again.'),
      }
    }

    const [userId, timestamp, receivedHmac] = stateParts

    // Verify the HMAC signature to prevent CSRF / state tampering
    const stateSecret = process.env.FIGMA_CLIENT_SECRET
    if (!stateSecret) {
      logger.error('FIGMA_CLIENT_SECRET not configured for state verification')
      return {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHtml('Server configuration error. Please contact support.'),
      }
    }

    const expectedHmac = crypto
      .createHmac('sha256', stateSecret)
      .update(`${userId}:${timestamp}`)
      .digest('hex')

    if (!crypto.timingSafeEqual(Buffer.from(receivedHmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
      logger.warn('Invalid HMAC in OAuth state — possible CSRF attempt', { userId })
      return {
        status: 403,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHtml('Invalid session. Please try again.'),
      }
    }

    // Check that the state is not older than 10 minutes
    const stateAge = Date.now() - parseInt(timestamp, 10)
    const maxAgeMs = 10 * 60 * 1000 // 10 minutes
    if (isNaN(stateAge) || stateAge < 0 || stateAge > maxAgeMs) {
      logger.warn('Expired OAuth state', { userId, stateAgeMs: stateAge })
      return {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHtml('Session expired. Please try again.'),
      }
    }

    logger.info('Processing Figma OAuth callback', { userId })

    // Exchange code for tokens
    const { data: tokenData, error: tokenError } = await exchangeCodeForToken(code)

    if (tokenError || !tokenData) {
      logger.error('Failed to exchange Figma code for token', { error: tokenError?.message })
      return {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHtml('Failed to connect to Figma. Please try again.'),
      }
    }

    // Get Figma user info
    const { data: userInfo, error: userError } = await getFigmaUser(tokenData.access_token)

    if (userError || !userInfo) {
      logger.error('Failed to get Figma user info', { error: userError?.message })
      return {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHtml('Failed to get your Figma account info.'),
      }
    }

    // Save connection to database
    const supabase = getMotiaSupabaseClient()
    const { error: saveError } = await saveFigmaConnection(
      supabase,
      userId,
      tokenData,
      userInfo
    )

    if (saveError) {
      logger.error('Failed to save Figma connection', { error: saveError.message })
      return {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
        body: getErrorHtml('Failed to save connection. Please try again.'),
      }
    }

    logger.info('Figma OAuth completed successfully', { userId, figmaUser: userInfo.handle })

    // Emit event for tracking
    enqueue({
      topic: 'figma-connected',
      data: {
        userId,
        figmaUserId: tokenData.user_id,
        figmaHandle: userInfo.handle,
      },
    }).catch(() => {})

    // Return HTML that handles both popup and same-window modes
    const successHtml = `
<!DOCTYPE html>
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
    .container {
      text-align: center;
      padding: 2rem;
    }
    .checkmark {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { opacity: 0.9; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>Connected to Figma!</h1>
    <p id="status">Redirecting...</p>
  </div>
  <script>
    (function() {
      // Check if we have a return URL stored (same-window mode)
      var returnUrl = sessionStorage.getItem('figma_oauth_return_url');

      if (returnUrl) {
        // Clear the stored URL
        sessionStorage.removeItem('figma_oauth_return_url');
        // Redirect back to the original page
        document.getElementById('status').textContent = 'Redirecting back...';
        setTimeout(function() {
          window.location.href = returnUrl;
        }, 1000);
      } else {
        // Popup mode - try to close the window
        document.getElementById('status').textContent = 'You can close this window now.';
        setTimeout(function() {
          window.close();
          // If window.close() didn't work (not opened by script), show message
          document.getElementById('status').textContent = 'Please close this tab to continue.';
        }, 1500);
      }
    })();
  </script>
</body>
</html>`

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
      body: successHtml,
    }
  } catch (err) {
    logger.error('Unexpected error in Figma OAuth callback', {
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    return {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
      body: getErrorHtml('An unexpected error occurred. Please try again.'),
    }
  }
}

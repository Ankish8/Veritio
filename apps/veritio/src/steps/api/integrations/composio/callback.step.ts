import type { StepConfig } from 'motia'
import { z } from 'zod'
import { errorHandlerMiddleware } from '../../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { saveComposioConnection, toolkitDisplayName } from '../../../../services/composio/index'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'

const querySchema = z.object({
  userId: z.string().min(1),
  toolkit: z.string().min(1),
  connected_account_id: z.string().optional(),
  returnUrl: z.string().optional(),
})

export const config = {
  name: 'ComposioOAuthCallback',
  description: 'Handle Composio OAuth callback',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/integrations/composio/callback',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: ['composio-connected'],
  flows: ['auth'],
} satisfies StepConfig

function getResponseHtml(type: 'success' | 'error', message: string, returnUrl?: string) {
  const isSuccess = type === 'success'
  const title = isSuccess ? `Connected to ${message}` : 'Connection Failed'
  const icon = isSuccess ? '&#10003;' : '&#10005;'
  const gradient = isSuccess
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'

  const redirectScript = isSuccess
    ? `
    var returnUrl = '${returnUrl || ''}' || sessionStorage.getItem('composio_oauth_return_url');
    if (returnUrl) {
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

  return `
<!DOCTYPE html>
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
  <div class="container">
    <div class="icon">${icon}</div>
    <h1>${title}${isSuccess ? '!' : ''}</h1>
    <p id="status">${isSuccess ? 'You can close this window now.' : message}</p>
  </div>
  <script>(function() { ${redirectScript} })();</script>
</body>
</html>`
}

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const htmlResponse = (status: number, type: 'success' | 'error', message: string, returnUrl?: string) => ({
    status,
    headers: { 'Content-Type': 'text/html' },
    body: getResponseHtml(type, message, returnUrl),
  })

  try {
    const query = querySchema.safeParse(req.queryParams)
    if (!query.success) {
      logger.warn('Invalid callback parameters', { errors: query.error.issues })
      return htmlResponse(400, 'error', 'Invalid request. Please try again.')
    }

    const { userId, toolkit, connected_account_id, returnUrl } = query.data
    logger.info('Processing OAuth callback', { userId, toolkit })

    if (!connected_account_id) {
      logger.warn('Missing connected_account_id', { userId, toolkit })
      return htmlResponse(400, 'error', 'Connection failed — no account ID received. Please try again.')
    }

    // Save connection to database
    const supabase = getMotiaSupabaseClient()
    const { error: saveError } = await saveComposioConnection(
      supabase,
      userId,
      toolkit,
      connected_account_id,
      null // account display will be populated later
    )

    if (saveError) {
      logger.error('Failed to save connection', { error: saveError.message })
      return htmlResponse(500, 'error', 'Failed to save connection. Please try again.')
    }

    logger.info('OAuth completed successfully', { userId, toolkit })
    await enqueue({ topic: 'composio-connected', data: { userId, toolkit } }).catch(() => {})

    return htmlResponse(200, 'success', toolkitDisplayName(toolkit), returnUrl)
  } catch (err) {
    logger.error('Unexpected error in OAuth callback', {
      error: err instanceof Error ? err.message : 'Unknown error',
    })
    return htmlResponse(500, 'error', 'An unexpected error occurred. Please try again.')
  }
}

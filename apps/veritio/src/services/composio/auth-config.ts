/**
 * Composio Custom Auth Configs
 *
 * Manages custom OAuth client credentials for Composio toolkits.
 * Env vars: COMPOSIO_{TOOLKIT_UPPER}_CLIENT_ID, COMPOSIO_{TOOLKIT_UPPER}_CLIENT_SECRET
 */

import { getComposioClient } from './index'

const authConfigCache = new Map<string, string>()

function getCustomCredentials(toolkit: string): { clientId: string; clientSecret: string } | null {
  const envPrefix = `COMPOSIO_${toolkit.toUpperCase()}`
  const clientId = process.env[`${envPrefix}_CLIENT_ID`]
  const clientSecret = process.env[`${envPrefix}_CLIENT_SECRET`]

  return clientId && clientSecret ? { clientId, clientSecret } : null
}

async function createAuthConfig(toolkit: string, clientId: string, clientSecret: string): Promise<string | undefined> {
  const composio = getComposioClient()
   
  const inner = (composio as any).client

  const result = await inner.authConfigs.create({
    appName: toolkit,
    type: 'oauth2',
    credentials: { client_id: clientId, client_secret: clientSecret },
  })

  return result?.id
}

async function findExistingAuthConfig(toolkit: string): Promise<string | undefined> {
  const composio = getComposioClient()
   
  const inner = (composio as any).client

  const configs = await inner.authConfigs.list({ appName: toolkit })
  const items = configs?.items ?? configs ?? []

  if (Array.isArray(items) && items.length > 0) {
    return (items[0] as any)?.id
  }

  return undefined
}

/**
 * Get or create a custom auth config for a toolkit.
 * Returns authConfigId if custom credentials are configured, undefined otherwise.
 */
export async function getOrCreateAuthConfig(toolkit: string): Promise<string | undefined> {
  const cached = authConfigCache.get(toolkit)
  if (cached) return cached

  const credentials = getCustomCredentials(toolkit)
  if (!credentials) return undefined

  try {
    const configId = await createAuthConfig(toolkit, credentials.clientId, credentials.clientSecret)
    if (configId) {
      authConfigCache.set(toolkit, configId)
      return configId
    }
  } catch {
    // Config already exists, try to find it
    try {
      const configId = await findExistingAuthConfig(toolkit)
      if (configId) {
        authConfigCache.set(toolkit, configId)
        return configId
      }
    } catch {
      // No custom config available
    }
  }

  return undefined
}

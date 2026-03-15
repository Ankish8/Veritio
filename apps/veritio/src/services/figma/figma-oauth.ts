import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

const FIGMA_AUTH_URL = 'https://www.figma.com/oauth'
const FIGMA_API_URL = 'https://api.figma.com/v1'

function getOAuthConfig() {
  const clientId = process.env.FIGMA_CLIENT_ID
  const clientSecret = process.env.FIGMA_CLIENT_SECRET
  const redirectUri = process.env.FIGMA_REDIRECT_URI
    || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'}/api/integrations/figma/callback`

  return { clientId, clientSecret, redirectUri }
}

export function isFigmaOAuthConfigured(): boolean {
  const { clientId, clientSecret } = getOAuthConfig()
  return !!(clientId && clientSecret)
}

export interface FigmaConnection {
  id: string
  user_id: string
  figma_user_id: string
  figma_email: string | null
  figma_handle: string | null
  figma_img_url: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  scopes: string[] | null
  connected_at: string
  updated_at: string
}

export interface FigmaTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user_id: string
}

export interface FigmaUserResponse {
  id: string
  email: string
  handle: string
  img_url: string
}

export function generateAuthUrl(state: string): string {
  const { clientId, redirectUri } = getOAuthConfig()

  if (!clientId) {
    throw new Error('FIGMA_CLIENT_ID not configured')
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'file_content:read,file_metadata:read,current_user:read,library_assets:read,library_content:read',
    state: state,
    response_type: 'code',
  })

  return `${FIGMA_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForToken(
  code: string
): Promise<{ data: FigmaTokenResponse | null; error: Error | null }> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig()

  if (!clientId || !clientSecret) {
    return { data: null, error: new Error('Figma OAuth not configured') }
  }

  try {
    const response = await fetch('https://api.figma.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        data: null,
        error: new Error(errorData.error_description || `Token exchange failed: ${response.status}`),
      }
    }

    const data = await response.json() as FigmaTokenResponse
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: new Error(`Token exchange failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
    }
  }
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ data: FigmaTokenResponse | null; error: Error | null }> {
  const { clientId, clientSecret } = getOAuthConfig()

  if (!clientId || !clientSecret) {
    return { data: null, error: new Error('Figma OAuth not configured') }
  }

  try {
    const response = await fetch('https://api.figma.com/v1/oauth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        data: null,
        error: new Error(errorData.error_description || `Token refresh failed: ${response.status}`),
      }
    }

    const data = await response.json() as FigmaTokenResponse
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: new Error(`Token refresh failed: ${err instanceof Error ? err.message : 'Unknown error'}`),
    }
  }
}

export async function getFigmaUser(
  accessToken: string
): Promise<{ data: FigmaUserResponse | null; error: Error | null }> {
  try {
    const response = await fetch(`${FIGMA_API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return { data: null, error: new Error(`Failed to get Figma user: ${response.status}`) }
    }

    const data = await response.json() as FigmaUserResponse
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: new Error(`Failed to get Figma user: ${err instanceof Error ? err.message : 'Unknown error'}`),
    }
  }
}

export async function getFigmaConnection(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ data: FigmaConnection | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('figma_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as FigmaConnection | null, error: null }
}

export async function saveFigmaConnection(
  supabase: SupabaseClientType,
  userId: string,
  tokenResponse: FigmaTokenResponse,
  userInfo: FigmaUserResponse
): Promise<{ data: FigmaConnection | null; error: Error | null }> {
  const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()

  const connectionData = {
    user_id: userId,
    figma_user_id: tokenResponse.user_id,
    figma_email: userInfo.email,
    figma_handle: userInfo.handle,
    figma_img_url: userInfo.img_url || null,
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token,
    token_expires_at: expiresAt,
    scopes: ['file_content:read', 'file_metadata:read', 'current_user:read', 'library_assets:read', 'library_content:read'],
  }

  const { data, error } = await supabase
    .from('figma_connections')
    .upsert(connectionData, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as FigmaConnection, error: null }
}

export async function deleteFigmaConnection(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await supabase
    .from('figma_connections')
    .delete()
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

/** Get a valid access token for a user, refreshing if expired. */
export async function getValidAccessToken(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ token: string | null; error: Error | null }> {
  const { data: connection, error: connectionError } = await getFigmaConnection(supabase, userId)

  if (connectionError || !connection) {
    return { token: null, error: connectionError || new Error('No Figma connection found') }
  }

  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null
  const isExpired = expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000

  if (!isExpired) {
    return { token: connection.access_token, error: null }
  }

  if (!connection.refresh_token) {
    return { token: null, error: new Error('Token expired and no refresh token available') }
  }

  const { data: newTokens, error: refreshError } = await refreshAccessToken(connection.refresh_token)

  if (refreshError || !newTokens) {
    return { token: null, error: refreshError || new Error('Token refresh failed') }
  }

  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()

  await supabase
    .from('figma_connections')
    .update({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token,
      token_expires_at: newExpiresAt,
    })
    .eq('user_id', userId)

  return { token: newTokens.access_token, error: null }
}

/**
 * Yjs Utility Functions
 */
export function getYjsServerUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_YJS_SERVER_URL || 'ws://localhost:4002'
  }

  // Use environment variable if set
  const envUrl = process.env.NEXT_PUBLIC_YJS_SERVER_URL
  if (envUrl) return envUrl

  // In development, use localhost
  if (window.location.hostname === 'localhost') {
    return 'ws://localhost:4002'
  }

  // In production, use same host with wss protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host.replace(/:\d+$/, '')}:4002`
}
export function createDocumentName(studyId: string): string {
  return `study:${studyId}`
}
export function getUserColor(userId: string): string {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ]

  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length]
}
export function getUserInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return '?'
}

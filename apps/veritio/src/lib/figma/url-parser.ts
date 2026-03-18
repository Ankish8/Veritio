export interface ParsedFigmaUrl {
  fileKey: string
  nodeId: string | null
  isValid: boolean
  error?: string
}

export function parseFigmaUrl(url: string): ParsedFigmaUrl {
  try {
    const parsed = new URL(url)

    if (!parsed.hostname.includes('figma.com')) {
      return { fileKey: '', nodeId: null, isValid: false, error: 'URL must be from figma.com' }
    }

    const pathMatch = parsed.pathname.match(/\/(proto|file|design)\/([a-zA-Z0-9]+)/)
    if (!pathMatch || !pathMatch[2]) {
      return { fileKey: '', nodeId: null, isValid: false, error: 'Could not find Figma file key in URL' }
    }

    const fileKey = pathMatch[2]
    const nodeId = parsed.searchParams.get('node-id')

    return {
      fileKey,
      nodeId: nodeId ? decodeURIComponent(nodeId) : null,
      isValid: true,
    }
  } catch {
    return { fileKey: '', nodeId: null, isValid: false, error: 'Invalid URL format' }
  }
}

export const MARKETING_ATTRIBUTION_COOKIE = '__veritio_attribution'

export const MARKETING_ATTRIBUTION_FIELDS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const

export type MarketingAttributionField = (typeof MARKETING_ATTRIBUTION_FIELDS)[number]

export interface MarketingAttribution {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
  capturedAt: string
}

const FIELD_LIMIT = 120
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g

function sanitize(value: string | null): string | null {
  if (!value) return null
  const normalized = value.normalize('NFKC').replace(CONTROL_CHARACTERS, '').trim()
  return normalized ? normalized.slice(0, FIELD_LIMIT) : null
}

export function readMarketingAttribution(
  searchParams: Pick<URLSearchParams, 'get'>,
  capturedAt = new Date().toISOString(),
): MarketingAttribution | null {
  const values = MARKETING_ATTRIBUTION_FIELDS.map((field) => sanitize(searchParams.get(field)))
  if (values.every((value) => value === null)) return null

  return {
    source: values[0],
    medium: values[1],
    campaign: values[2],
    content: values[3],
    term: values[4],
    capturedAt,
  }
}

export function serializeMarketingAttribution(attribution: MarketingAttribution): string {
  const params = new URLSearchParams()
  if (attribution.source) params.set('source', attribution.source)
  if (attribution.medium) params.set('medium', attribution.medium)
  if (attribution.campaign) params.set('campaign', attribution.campaign)
  if (attribution.content) params.set('content', attribution.content)
  if (attribution.term) params.set('term', attribution.term)
  params.set('capturedAt', attribution.capturedAt)
  return params.toString()
}

export function parseMarketingAttribution(value: string | null | undefined): MarketingAttribution | null {
  if (!value || value.length > 1024) return null
  const params = new URLSearchParams(value)
  const capturedAt = params.get('capturedAt')
  if (!capturedAt || Number.isNaN(Date.parse(capturedAt))) return null

  const result: MarketingAttribution = {
    source: sanitize(params.get('source')),
    medium: sanitize(params.get('medium')),
    campaign: sanitize(params.get('campaign')),
    content: sanitize(params.get('content')),
    term: sanitize(params.get('term')),
    capturedAt: new Date(capturedAt).toISOString(),
  }
  return [result.source, result.medium, result.campaign, result.content, result.term].some(Boolean)
    ? result
    : null
}

export function readMarketingAttributionCookie(cookieHeader: string | string[] | undefined) {
  const header = Array.isArray(cookieHeader) ? cookieHeader.join(';') : cookieHeader
  if (!header) return null
  const raw = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${MARKETING_ATTRIBUTION_COOKIE}=`))
    ?.slice(MARKETING_ATTRIBUTION_COOKIE.length + 1)
  if (!raw) return null

  try {
    return parseMarketingAttribution(decodeURIComponent(raw))
  } catch {
    return null
  }
}

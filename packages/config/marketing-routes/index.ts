import { researchMethodFeatureMatrix } from './methods'
export { findResearchMethod, researchMethodFeatureMatrix } from './methods'

export type MarketingAudience =
  | 'all'
  | 'researchers'
  | 'education'
  | 'developers'
  | 'self-hosters'

export type EditionAvailability = 'hosted' | 'self-hosted' | 'both'
export type MarketingCtaTarget = 'hosted' | 'self-hosted' | 'hosted-and-self-hosted' | 'none'

export interface MarketingRoute {
  path: `/${string}` | '/'
  audience: MarketingAudience
  editionAvailability: EditionAvailability
  canonicalUrl: `https://veritio.io${string}`
  ctaTarget: MarketingCtaTarget
  sitemap: boolean
  changeFrequency?: 'weekly' | 'monthly' | 'yearly'
  priority?: number
  navigation?: {
    label: string
    order: number
    href?: string
    publicationGate?: 'repository-public'
  }
  footer?: { group: 'company' | 'legal'; label: string; order: number }
  redirectFrom?: readonly `/${string}`[]
}

export const HOSTED_SIGNUP_URL = 'https://veritio.io/sign-up' as const
export const OPEN_SOURCE_REPOSITORY_URL = 'https://github.com/Ankish8/Veritio' as const

export interface MarketingCta {
  kind: 'hosted' | 'self-hosted'
  label: 'Try hosted Veritio' | 'Self-host from GitHub'
  href: typeof HOSTED_SIGNUP_URL | typeof OPEN_SOURCE_REPOSITORY_URL
}

export const methodMarketingRoutes: readonly MarketingRoute[] = researchMethodFeatureMatrix.map(
  (method, index) => ({
    path: `/methods/${method.slug}`,
    audience: 'researchers',
    editionAvailability: method.editionAvailability,
    canonicalUrl: `https://veritio.io/methods/${method.slug}`,
    ctaTarget: 'hosted-and-self-hosted',
    sitemap: true,
    changeFrequency: 'monthly',
    priority: 0.72 - index * 0.01,
  }),
)

export const marketingRoutes: readonly MarketingRoute[] = [
  {
    path: '/',
    audience: 'all',
    editionAvailability: 'both',
    canonicalUrl: 'https://veritio.io/',
    ctaTarget: 'hosted',
    sitemap: true,
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    path: '/open-source',
    audience: 'developers',
    editionAvailability: 'both',
    canonicalUrl: 'https://veritio.io/open-source',
    ctaTarget: 'hosted-and-self-hosted',
    sitemap: true,
    changeFrequency: 'weekly',
    priority: 0.9,
    navigation: {
      label: 'GitHub',
      order: 35,
      href: OPEN_SOURCE_REPOSITORY_URL,
      publicationGate: 'repository-public',
    },
    footer: { group: 'company', label: 'Open Source', order: 35 },
  },
  {
    path: '/self-hosted',
    audience: 'self-hosters',
    editionAvailability: 'self-hosted',
    canonicalUrl: 'https://veritio.io/self-hosted',
    ctaTarget: 'hosted-and-self-hosted',
    sitemap: true,
    changeFrequency: 'weekly',
    priority: 0.85,
    footer: { group: 'company', label: 'Self-hosting', order: 36 },
  },
  {
    path: '/pricing',
    audience: 'all',
    editionAvailability: 'hosted',
    canonicalUrl: 'https://veritio.io/pricing',
    ctaTarget: 'hosted',
    sitemap: true,
    changeFrequency: 'weekly',
    priority: 0.8,
    navigation: { label: 'Pricing', order: 30 },
    footer: { group: 'company', label: 'Pricing', order: 30 },
  },
  {
    path: '/education',
    audience: 'education',
    editionAvailability: 'hosted',
    canonicalUrl: 'https://veritio.io/education',
    ctaTarget: 'hosted',
    sitemap: true,
    changeFrequency: 'monthly',
    priority: 0.8,
    navigation: { label: 'Education', order: 40 },
    footer: { group: 'company', label: 'For Education', order: 40 },
    redirectFrom: ['/for-universities'],
  },
  {
    path: '/about',
    audience: 'all',
    editionAvailability: 'both',
    canonicalUrl: 'https://veritio.io/about',
    ctaTarget: 'hosted',
    sitemap: true,
    changeFrequency: 'monthly',
    priority: 0.6,
    footer: { group: 'company', label: 'About Us', order: 20 },
  },
  {
    path: '/mcp-server',
    audience: 'developers',
    editionAvailability: 'both',
    canonicalUrl: 'https://veritio.io/mcp-server',
    ctaTarget: 'hosted',
    sitemap: true,
    changeFrequency: 'monthly',
    priority: 0.7,
    footer: { group: 'company', label: 'MCP Server', order: 50 },
  },
  {
    path: '/security',
    audience: 'all',
    editionAvailability: 'both',
    canonicalUrl: 'https://veritio.io/security',
    ctaTarget: 'none',
    sitemap: true,
    changeFrequency: 'monthly',
    priority: 0.5,
    footer: { group: 'legal', label: 'Security', order: 40 },
  },
  {
    path: '/privacy',
    audience: 'all',
    editionAvailability: 'hosted',
    canonicalUrl: 'https://veritio.io/privacy',
    ctaTarget: 'none',
    sitemap: true,
    changeFrequency: 'yearly',
    priority: 0.3,
    footer: { group: 'legal', label: 'Privacy Policy', order: 10 },
  },
  {
    path: '/terms',
    audience: 'all',
    editionAvailability: 'hosted',
    canonicalUrl: 'https://veritio.io/terms',
    ctaTarget: 'none',
    sitemap: true,
    changeFrequency: 'yearly',
    priority: 0.3,
    footer: { group: 'legal', label: 'Terms & Conditions', order: 20 },
  },
  {
    path: '/accessibility',
    audience: 'all',
    editionAvailability: 'both',
    canonicalUrl: 'https://veritio.io/accessibility',
    ctaTarget: 'none',
    sitemap: true,
    changeFrequency: 'yearly',
    priority: 0.3,
    footer: { group: 'legal', label: 'Accessibility', order: 30 },
  },
  {
    path: '/ltd',
    audience: 'all',
    editionAvailability: 'hosted',
    canonicalUrl: 'https://veritio.io/ltd',
    ctaTarget: 'hosted',
    sitemap: false,
  },
  ...methodMarketingRoutes,
] as const

export function findMarketingRoute(path: MarketingRoute['path']): MarketingRoute {
  const route = marketingRoutes.find((candidate) => candidate.path === path)
  if (!route) throw new Error(`Unknown marketing route: ${path}`)
  return route
}

export function withMarketingCanonical<T extends object>(path: MarketingRoute['path'], metadata: T) {
  return {
    ...metadata,
    alternates: { canonical: findMarketingRoute(path).canonicalUrl },
  }
}

export function isRepositoryPublic(env = process.env) {
  return env.NEXT_PUBLIC_OPEN_SOURCE_REPOSITORY_PUBLIC === 'true'
}

export function marketingCtas(route: MarketingRoute, repositoryPublic: boolean) {
  const ctas: MarketingCta[] = []
  if (route.ctaTarget === 'hosted' || route.ctaTarget === 'hosted-and-self-hosted') {
    ctas.push({ kind: 'hosted', label: 'Try hosted Veritio', href: HOSTED_SIGNUP_URL })
  }
  if (
    repositoryPublic &&
    (route.ctaTarget === 'self-hosted' || route.ctaTarget === 'hosted-and-self-hosted')
  ) {
    ctas.push({
      kind: 'self-hosted',
      label: 'Self-host from GitHub',
      href: OPEN_SOURCE_REPOSITORY_URL,
    })
  }
  return ctas
}

export function visibleNavigationRoutes(repositoryPublic: boolean) {
  return marketingRoutes
    .filter((route) => {
      if (!route.navigation) return false
      return route.navigation.publicationGate !== 'repository-public' || repositoryPublic
    })
    .sort((left, right) => left.navigation!.order - right.navigation!.order)
}

export function footerRoutes(group: 'company' | 'legal') {
  return marketingRoutes
    .filter((route) => route.footer?.group === group)
    .sort((left, right) => left.footer!.order - right.footer!.order)
}

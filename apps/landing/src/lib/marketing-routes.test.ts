import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  footerRoutes,
  findMarketingRoute,
  marketingCtas,
  marketingRoutes,
  visibleNavigationRoutes,
} from '../../../../packages/config/marketing-routes/index'

const appDirectory = fileURLToPath(new URL('../app/', import.meta.url))

describe('marketing route manifest', () => {
  it('contains unique paths and canonical URLs', () => {
    expect(new Set(marketingRoutes.map((route) => route.path)).size).toBe(marketingRoutes.length)
    expect(new Set(marketingRoutes.map((route) => route.canonicalUrl)).size).toBe(
      marketingRoutes.length,
    )

    for (const route of marketingRoutes) {
      expect(route.canonicalUrl).toBe(`https://veritio.io${route.path}`)
    }
  })

  it('has a landing page for every routed marketing path', async () => {
    for (const route of marketingRoutes) {
      if (route.path === '/') continue
      if (route.path.startsWith('/methods/')) {
        await expect(access(`${appDirectory}methods/[slug]/page.tsx`)).resolves.toBeUndefined()
        continue
      }
      await expect(access(`${appDirectory}${route.path}/page.tsx`)).resolves.toBeUndefined()
    }
  })

  it('keeps GitHub out of navigation until publication', () => {
    expect(visibleNavigationRoutes(false).some((route) => route.navigation?.label === 'GitHub')).toBe(false)
    expect(visibleNavigationRoutes(true).some((route) => route.navigation?.label === 'GitHub')).toBe(true)
  })

  it('keeps education canonical and declares the university redirect', () => {
    const education = marketingRoutes.find((route) => route.path === '/education')
    expect(education?.canonicalUrl).toBe('https://veritio.io/education')
    expect(education?.redirectFrom).toContain('/for-universities')
  })

  it('derives footer groups from the same manifest', () => {
    expect(footerRoutes('company').map((route) => route.path)).toContain('/open-source')
    expect(footerRoutes('company').map((route) => route.path)).toContain('/self-hosted')
    expect(footerRoutes('legal').map((route) => route.path)).toContain('/security')
  })

  it('derives publication-gated CTA destinations from the manifest', () => {
    const route = findMarketingRoute('/open-source')
    expect(marketingCtas(route, false).map((cta) => cta.kind)).toEqual(['hosted'])
    expect(marketingCtas(route, true).map((cta) => cta.kind)).toEqual([
      'hosted',
      'self-hosted',
    ])
  })
})

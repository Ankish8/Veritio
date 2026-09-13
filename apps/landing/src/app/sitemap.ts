import type { MetadataRoute } from 'next'
import { marketingRoutes } from '@veritio/marketing-routes'

export default function sitemap(): MetadataRoute.Sitemap {
  return marketingRoutes
    .filter((route) => route.sitemap)
    .map((route) => ({
      url: route.canonicalUrl,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }))
}

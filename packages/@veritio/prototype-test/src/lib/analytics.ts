// Analytics tracking stub
export function trackEvent(event: string, properties?: Record<string, any>) {
  // Implementation depends on analytics provider
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(event, properties)
  }
}

export function trackPageView(page: string) {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.page(page)
  }
}

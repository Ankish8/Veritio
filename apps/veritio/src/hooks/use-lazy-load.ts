'use client'

import { useState, useEffect, useRef, type RefObject } from 'react'

/** Lazy loads heavy components when they become visible via IntersectionObserver. */
export function useLazyLoad<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number
  rootMargin?: string
}): {
  containerRef: RefObject<T | null>
  shouldLoad: boolean
} {
  const { threshold = 0.1, rootMargin = '0px' } = options ?? {}
  const [shouldLoad, setShouldLoad] = useState(false)
  const containerRef = useRef<T>(null)

  useEffect(() => {
    if (shouldLoad) return // Already triggered, no need to observe

    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [shouldLoad, threshold, rootMargin])

  return { containerRef, shouldLoad }
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { FirstImpressionDesignWithQuestions } from '../types'

interface ImageStatus {
  url: string
  loaded: boolean
  error: boolean
  width?: number
  height?: number
}

interface UseImagePreloaderOptions {
  autoStart?: boolean
  mobileBreakpoint?: number
}

interface UseImagePreloaderReturn {
  isComplete: boolean
  isLoading: boolean
  loadedCount: number
  totalCount: number
  progress: number
  imageStatuses: Map<string, ImageStatus>
  hasErrors: boolean
  startPreloading: () => void
  getImageUrl: (design: FirstImpressionDesignWithQuestions) => string
}

export function useImagePreloader(
  designs: FirstImpressionDesignWithQuestions[],
  options: UseImagePreloaderOptions = {}
): UseImagePreloaderReturn {
  const { autoStart = true, mobileBreakpoint = 768 } = options

  const [imageStatuses, setImageStatuses] = useState<Map<string, ImageStatus>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const preloadedRef = useRef<Set<string>>(new Set())

  // Determine if we should use mobile images
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [mobileBreakpoint])

  // Get the appropriate image URL for a design
  const getImageUrl = useCallback(
    (design: FirstImpressionDesignWithQuestions): string => {
      if (isMobile && design.mobile_image_url) {
        return design.mobile_image_url
      }
      return design.image_url || ''
    },
    [isMobile]
  )

  // Get all image URLs to preload
  const getImageUrls = useCallback((): string[] => {
    const urls: string[] = []
    for (const design of designs) {
      const url = getImageUrl(design)
      if (url && !urls.includes(url)) {
        urls.push(url)
      }
    }
    return urls
  }, [designs, getImageUrl])

  // Preload a single image
  const preloadImage = useCallback((url: string): Promise<ImageStatus> => {
    return new Promise((resolve) => {
      // Already preloaded
      if (preloadedRef.current.has(url)) {
        const existing = imageStatuses.get(url)
        if (existing) {
          resolve(existing)
          return
        }
      }

      const img = new Image()

      img.onload = () => {
        const status: ImageStatus = {
          url,
          loaded: true,
          error: false,
          width: img.naturalWidth,
          height: img.naturalHeight,
        }
        preloadedRef.current.add(url)
        resolve(status)
      }

      img.onerror = () => {
        const status: ImageStatus = {
          url,
          loaded: false,
          error: true,
        }
        preloadedRef.current.add(url)
        resolve(status)
      }

      img.src = url
    })
  }, [imageStatuses])

  // Start preloading all images
  const startPreloading = useCallback(async () => {
    if (hasStarted) return

    setHasStarted(true)
    setIsLoading(true)

    const urls = getImageUrls()
    const newStatuses = new Map<string, ImageStatus>()

    // Initialize all as loading
    for (const url of urls) {
      newStatuses.set(url, { url, loaded: false, error: false })
    }
    setImageStatuses(new Map(newStatuses))

    // Preload all images in parallel
    const results = await Promise.all(urls.map(preloadImage))

    // Update with final statuses
    for (const status of results) {
      newStatuses.set(status.url, status)
    }
    setImageStatuses(new Map(newStatuses))
    setIsLoading(false)
  }, [hasStarted, getImageUrls, preloadImage])

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && designs.length > 0 && !hasStarted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startPreloading()
    }
  }, [autoStart, designs.length, hasStarted, startPreloading])

  // Calculate derived state
  const totalCount = getImageUrls().length
  const loadedCount = Array.from(imageStatuses.values()).filter(
    (s) => s.loaded || s.error
  ).length
  // If no images to load (totalCount === 0), consider it complete immediately
  const isComplete = totalCount === 0 || loadedCount >= totalCount
  const hasErrors = Array.from(imageStatuses.values()).some((s) => s.error)
  const progress = totalCount > 0 ? Math.round((loadedCount / totalCount) * 100) : 100

  return {
    isComplete,
    isLoading,
    loadedCount,
    totalCount,
    progress,
    imageStatuses,
    hasErrors,
    startPreloading,
    getImageUrl,
  }
}

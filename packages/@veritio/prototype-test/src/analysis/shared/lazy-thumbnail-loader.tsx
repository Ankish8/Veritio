'use client'


import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
  type CSSProperties,
} from 'react'
import { cn } from '@veritio/ui'
import { ImageIcon, RefreshCw, AlertCircle } from 'lucide-react'


export interface LazyThumbnailProps {
  src: string | null | undefined
  alt: string
  width?: number | string
  height?: number | string
  aspectRatio?: string
  className?: string
  rootMargin?: string
  placeholderColor?: string
  showSkeleton?: boolean
  blurUp?: boolean
  lowResSrc?: string
  onLoad?: () => void
  onError?: (error: Error) => void
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  retryAttempts?: number
  fallback?: React.ReactNode
}

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error'


export const LazyThumbnail = memo(function LazyThumbnail({
  src,
  alt,
  width,
  height,
  aspectRatio,
  className,
  rootMargin = '200px',
  placeholderColor,
  showSkeleton = true,
  blurUp = false,
  lowResSrc,
  onLoad,
  onError,
  objectFit = 'cover',
  retryAttempts = 2,
  fallback,
}: LazyThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [showBlur, setShowBlur] = useState(blurUp)

  // Set up intersection observer
  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          // Once intersected, we can disconnect
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [rootMargin])

  // Start loading when intersecting
  useEffect(() => {
    if (isIntersecting && src && loadingState === 'idle') {
      setLoadingState('loading')
    }
  }, [isIntersecting, src, loadingState])

  const handleLoad = useCallback(() => {
    setLoadingState('loaded')
    // Delay blur removal for smooth transition
    if (blurUp) {
      setTimeout(() => setShowBlur(false), 100)
    }
    onLoad?.()
  }, [blurUp, onLoad])

  const handleError = useCallback(() => {
    if (retryCount < retryAttempts) {
      // Retry loading
      setRetryCount((prev) => prev + 1)
      setLoadingState('idle')
      // Re-trigger by setting to loading after a delay
      setTimeout(() => setLoadingState('loading'), 500)
    } else {
      setLoadingState('error')
      onError?.(new Error(`Failed to load image: ${src}`))
    }
  }, [retryCount, retryAttempts, onError, src])

  const handleRetry = useCallback(() => {
    setRetryCount(0)
    setLoadingState('idle')
    setTimeout(() => setLoadingState('loading'), 100)
  }, [])

  // Calculate container styles
  const containerStyle: CSSProperties = {
    width: width ?? '100%',
    ...(aspectRatio ? { aspectRatio } : { height: height ?? 'auto' }),
    backgroundColor: placeholderColor,
  }

  // No source provided
  if (!src) {
    return (
      <div
        ref={containerRef}
        className={cn(
          'relative flex items-center justify-center bg-muted rounded overflow-hidden',
          className
        )}
        style={containerStyle}
      >
        {fallback || <NoImagePlaceholder />}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded bg-muted',
        className
      )}
      style={containerStyle}
    >
      {/* Skeleton/Loading state */}
      {(loadingState === 'idle' || loadingState === 'loading') && showSkeleton && (
        <ThumbnailSkeleton />
      )}

      {/* Low-res blur-up placeholder */}
      {blurUp && lowResSrc && showBlur && (
        <img
          src={lowResSrc}
          alt=""
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            'blur-lg scale-105 transition-opacity duration-300',
            loadingState === 'loaded' ? 'opacity-0' : 'opacity-100'
          )}
          aria-hidden
        />
      )}

      {/* Main image */}
      {loadingState !== 'idle' && loadingState !== 'error' && (
        <img
          src={src}
          alt={alt}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            loadingState === 'loaded' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ objectFit }}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Error state */}
      {loadingState === 'error' && (
        <ErrorPlaceholder onRetry={handleRetry} retryCount={retryCount} />
      )}
    </div>
  )
})


function ThumbnailSkeleton() {
  return (
    <div className="absolute inset-0 bg-muted animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
    </div>
  )
}

function NoImagePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center text-muted-foreground/50 gap-1">
      <ImageIcon className="h-6 w-6" />
      <span className="text-xs">No image</span>
    </div>
  )
}

function ErrorPlaceholder({
  onRetry,
  retryCount,
}: {
  onRetry: () => void
  retryCount: number
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2 p-2">
      <AlertCircle className="h-5 w-5 text-destructive/70" />
      <span className="text-xs text-center">Failed to load</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  )
}


export interface ThumbnailBatchLoaderProps {
  thumbnails: Array<{
    src: string | null | undefined
    alt: string
    id: string
  }>
  renderThumbnail: (
    thumbnail: { src: string | null | undefined; alt: string; id: string },
    isLoaded: boolean
  ) => React.ReactNode
  onAllLoaded?: () => void
  maxConcurrent?: number
}

export function ThumbnailBatchLoader({
  thumbnails,
  renderThumbnail,
  onAllLoaded,
  maxConcurrent = 3,
}: ThumbnailBatchLoaderProps) {
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set())
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const queueRef = useRef<string[]>([])

  // Initialize queue with all IDs
  useEffect(() => {
    queueRef.current = thumbnails.map((t) => t.id)
    // Start initial batch
    processQueue()
  }, [thumbnails])

  const processQueue = useCallback(() => {
    const currentlyLoading = loadingIds.size
    const slotsAvailable = maxConcurrent - currentlyLoading

    if (slotsAvailable <= 0 || queueRef.current.length === 0) return

    const toLoad = queueRef.current.splice(0, slotsAvailable)
    setLoadingIds((prev) => {
      const next = new Set(prev)
      toLoad.forEach((id) => next.add(id))
      return next
    })
  }, [loadingIds.size, maxConcurrent])

  const handleLoaded = useCallback((id: string) => {
    setLoadedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setLoadingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })

    // Process next in queue
    setTimeout(processQueue, 0)

    // Check if all loaded
    if (loadedIds.size + 1 === thumbnails.length) {
      onAllLoaded?.()
    }
  }, [thumbnails.length, onAllLoaded, processQueue, loadedIds.size])

  return (
    <>
      {thumbnails.map((thumbnail) => (
        <div key={thumbnail.id}>
          {renderThumbnail(thumbnail, loadedIds.has(thumbnail.id))}
        </div>
      ))}
    </>
  )
}


interface UseImagePreloaderOptions {
  urls: (string | null | undefined)[]
  enabled?: boolean
  maxConcurrent?: number
}

interface UseImagePreloaderResult {
  loadedUrls: Set<string>
  loadingUrls: Set<string>
  failedUrls: Set<string>
  isComplete: boolean
  progress: number
}

export function useImagePreloader({
  urls,
  enabled = true,
  maxConcurrent = 3,
}: UseImagePreloaderOptions): UseImagePreloaderResult {
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set())
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set())
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
  const queueRef = useRef<string[]>([])

  // Filter valid URLs
  const validUrls = urls.filter((url): url is string => !!url)

  useEffect(() => {
    if (!enabled) return

    // Reset state
    setLoadedUrls(new Set())
    setLoadingUrls(new Set())
    setFailedUrls(new Set())

    // Initialize queue
    queueRef.current = [...validUrls]

    const processQueue = () => {
      const currentlyLoading = loadingUrls.size
      const slotsAvailable = maxConcurrent - currentlyLoading

      if (slotsAvailable <= 0 || queueRef.current.length === 0) return

      const toLoad = queueRef.current.splice(0, slotsAvailable)

      toLoad.forEach((url) => {
        setLoadingUrls((prev) => new Set(prev).add(url))

        const img = new Image()
        img.onload = () => {
          setLoadedUrls((prev) => new Set(prev).add(url))
          setLoadingUrls((prev) => {
            const next = new Set(prev)
            next.delete(url)
            return next
          })
          processQueue()
        }
        img.onerror = () => {
          setFailedUrls((prev) => new Set(prev).add(url))
          setLoadingUrls((prev) => {
            const next = new Set(prev)
            next.delete(url)
            return next
          })
          processQueue()
        }
        img.src = url
      })
    }

    processQueue()
  }, [enabled, validUrls.join(','), maxConcurrent])

  const total = validUrls.length
  const completed = loadedUrls.size + failedUrls.size
  const progress = total > 0 ? (completed / total) * 100 : 0
  const isComplete = completed === total

  return {
    loadedUrls,
    loadingUrls,
    failedUrls,
    isComplete,
    progress,
  }
}

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Skeleton } from '@veritio/ui'

import 'rrweb-player/dist/style.css'

interface ReplayPlayerProps {
  events: any[]
  width?: number
  height?: number
  onPlayerReady?: (player: any) => void
}

export default function ReplayPlayer({ events, width: originalWidth, height: originalHeight, onPlayerReady }: ReplayPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [containerWidth, setContainerWidth] = useState(0)

  const measureWidth = useCallback(() => {
    if (wrapperRef.current) {
      setContainerWidth(wrapperRef.current.clientWidth)
    }
  }, [])

  useEffect(() => {
    measureWidth()
    const observer = new ResizeObserver(measureWidth)
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [measureWidth])

  useEffect(() => {
    if (!containerRef.current || events.length === 0 || containerWidth === 0) return

    let cancelled = false

    const srcWidth = originalWidth || 1024
    const srcHeight = originalHeight || 576
    const displayWidth = containerWidth - 2 // -2 for border
    const displayHeight = Math.round(displayWidth * (srcHeight / srcWidth))

    import('rrweb-player').then(({ default: RrwebPlayer }) => {
      if (cancelled || !containerRef.current) return

      if (playerRef.current) {
        playerRef.current.$destroy?.()
        if (containerRef.current) containerRef.current.innerHTML = ''
      }

      playerRef.current = new RrwebPlayer({
        target: containerRef.current!,
        props: {
          events,
          width: displayWidth,
          height: displayHeight,
          skipInactive: true,
          showController: true,
          autoPlay: true,
          speed: 1,
          speedOption: [0.5, 1, 2, 4, 8],
          mouseTail: true,
          UNSAFE_replayCanvas: false,
        },
      })
      setIsReady(true)
      onPlayerReady?.(playerRef.current)
    })

    return () => {
      cancelled = true
      if (playerRef.current) {
        playerRef.current.$destroy?.()
        playerRef.current = null
      }
    }
  }, [events, originalWidth, originalHeight, containerWidth]) // eslint-disable-line react-hooks/exhaustive-deps

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-[576px] rounded-lg border bg-muted/30">
        <p className="text-muted-foreground">No events to replay</p>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="rounded-b-lg border bg-muted/30 overflow-hidden">
      <style>{`
        .rr-player { max-width: 100% !important; }
        .rr-player__frame { max-width: 100% !important; overflow: hidden !important; }
        .replayer-wrapper { max-width: 100% !important; }
        .rr-controller { max-width: 100% !important; padding: 4px 8px !important; min-height: auto !important; }
        .rr-controller__btns { padding: 2px 0 !important; gap: 8px !important; }
        /* Hide speed buttons (0.5x–8x = children 2-6) and fullscreen (last child) */
        .rr-controller__btns > :nth-child(n+2):nth-child(-n+6) {
          display: none !important;
        }
        .rr-controller__btns > :last-child {
          display: none !important;
        }
      `}</style>
      {!isReady && <Skeleton className="w-full aspect-video" />}
      <div ref={containerRef} className={isReady ? '' : 'hidden'} />
    </div>
  )
}

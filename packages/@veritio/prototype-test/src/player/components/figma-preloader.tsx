'use client'

import { useMemo } from 'react'
import { generateEmbedUrl } from '../../services/figma/embed-url'
import type { PrototypeTestPrototype, PrototypeTestFrame, PrototypeTestTask } from '@veritio/study-types'
import { getFrameIdFromFigmaNodeId } from '../../lib/figma-frame-matching'

interface FigmaPreloaderProps {
  prototype: PrototypeTestPrototype | null | undefined
  frames: PrototypeTestFrame[]
  tasks: PrototypeTestTask[]
}
export function FigmaPreloader({ prototype, frames, tasks }: FigmaPreloaderProps) {
  // Get the first task's starting frame for initial preload
  const firstTask = tasks[0]

  const startingFrameId = useMemo(() => {
    if (!firstTask?.start_frame_id || frames.length === 0) return null
    const frame = frames.find(f => f.id === firstTask.start_frame_id)
    return frame?.figma_node_id ?? null
  }, [firstTask, frames])

  // Generate the embed URL for preloading
  const embedUrl = useMemo(() => {
    if (!prototype?.figma_url) return null
    return generateEmbedUrl(prototype.figma_url, {
      startNodeId: startingFrameId,
      showHotspotHints: false,
      enableEmbedApi: true,
      scaleMode: 'fit',
    })
  }, [prototype?.figma_url, startingFrameId])

  // Don't render if no prototype URL
  if (!embedUrl) return null

  return (
    <div
      className="fixed"
      style={{
        // Position off-screen but still loads (unlike display:none)
        top: '-9999px',
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <iframe
        src={embedUrl}
        title="Figma Preloader"
        width="1"
        height="1"
        style={{ border: 'none' }}
      />
    </div>
  )
}

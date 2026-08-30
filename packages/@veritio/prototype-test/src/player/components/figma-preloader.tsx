'use client'

import { useMemo } from 'react'
import { generateEmbedUrl } from '../../services/figma/embed-url'
import type {
  PrototypeTestPrototype,
  PrototypeTestFrame,
  PrototypeTestTask,
  PrototypeTestSettings,
} from '@veritio/study-types'
import { getScaleMode } from '../utils'

interface FigmaPreloaderProps {
  prototype: PrototypeTestPrototype | null | undefined
  frames: PrototypeTestFrame[]
  tasks: PrototypeTestTask[]
  /** Study settings, so the warmed URL matches the one the player will request. */
  settings?: PrototypeTestSettings | null
}
export function FigmaPreloader({ prototype, frames, tasks, settings }: FigmaPreloaderProps) {
  // Get the first task's starting frame for initial preload
  const firstTask = tasks[0]

  const startingFrameId = useMemo(() => {
    if (!firstTask?.start_frame_id || frames.length === 0) return null
    const frame = frames.find(f => f.id === firstTask.start_frame_id)
    return frame?.figma_node_id ?? null
  }, [firstTask, frames])

  // Generate the embed URL for preloading.
  //
  // These options must match what FigmaEmbed will ask for. They were hardcoded
  // to `scaleMode: 'fit'` / no hotspot hints, so for any study configured
  // otherwise the preloaded URL differed from the real one — the browser cached
  // a document the player never requested and the warm-up did nothing but open
  // a second live Figma session.
  const showHotspotHints = settings?.clickableAreaFlashing ?? false
  const scaleMode = getScaleMode(settings?.scalePrototype)

  const embedUrl = useMemo(() => {
    if (!prototype?.figma_url) return null
    return generateEmbedUrl(prototype.figma_url, {
      startNodeId: startingFrameId,
      showHotspotHints,
      enableEmbedApi: true,
      scaleMode,
    })
  }, [prototype?.figma_url, startingFrameId, showHotspotHints, scaleMode])

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

import type { ReactNode } from 'react'
import type { BrandingSettings } from '@/components/builders/shared/types'
import { getOptimizedImgProps } from '@/lib/optimized-image'
import {
  getBackgroundObjectPosition,
  resolveStudyBackground,
} from '@/lib/study-background'
import { cn } from '@/lib/utils'

interface StudyBackgroundLayerProps {
  branding: BrandingSettings | null | undefined
  position?: 'fixed' | 'absolute'
  className?: string
}

export function StudyBackgroundLayer({
  branding,
  position = 'fixed',
  className,
}: StudyBackgroundLayerProps) {
  const background = resolveStudyBackground(branding)
  const image = background.mode === 'image' ? background.image : undefined
  const objectPosition = getBackgroundObjectPosition(background.position)
  const optimizedImage = image && background.layout !== 'tile'
      ? getOptimizedImgProps(image.url, {
        width: 2400,
        sizes: '100vw',
      })
    : null

  return (
    <div
      aria-hidden="true"
      data-study-background-layer=""
      className={cn(
        position === 'fixed' ? 'fixed' : 'absolute',
        'pointer-events-none inset-0 z-0 overflow-hidden',
        className,
      )}
      style={{
        backgroundColor:
          'var(--study-background-fallback, var(--style-page-bg, #f8fafc))',
      }}
    >
      {image && background.layout === 'tile' && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${JSON.stringify(image.url)})`,
            backgroundPosition: objectPosition,
            backgroundRepeat: 'repeat',
          }}
        />
      )}
      {image && optimizedImage && (
        // The uploaded asset is decorative. Responsive sources avoid loading
        // the full original for smaller participant viewports.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...optimizedImage}
          alt=""
          decoding="async"
          draggable={false}
          fetchPriority="high"
          loading="eager"
          className="absolute inset-0 h-full w-full select-none"
          style={{
            objectFit: background.layout === 'fill' ? 'cover' : 'contain',
            objectPosition,
          }}
        />
      )}
      {image && background.overlayOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: background.overlayOpacity / 100 }}
        />
      )}
    </div>
  )
}

interface StudyBackgroundShellProps {
  branding: BrandingSettings | null | undefined
  children: ReactNode
  className?: string
  layerPosition?: 'fixed' | 'absolute'
}

export function StudyBackgroundShell({
  branding,
  children,
  className,
  layerPosition = 'fixed',
}: StudyBackgroundShellProps) {
  const background = resolveStudyBackground(branding)

  return (
    <div
      data-study-background={background.mode}
      data-content-surface={background.contentSurface}
      className={cn('relative isolate min-h-dvh', className)}
      style={{
        backgroundColor:
          'var(--study-background-fallback, var(--style-page-bg, #f8fafc))',
      }}
    >
      <StudyBackgroundLayer
        branding={branding}
        position={layerPosition}
      />
      <div className="relative z-10 min-h-dvh">{children}</div>
    </div>
  )
}

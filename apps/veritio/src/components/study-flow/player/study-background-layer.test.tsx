import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { BrandingSettings } from '@/components/builders/shared/types'
import { StudyBackgroundLayer } from './study-background-layer'

vi.mock('next/image', () => ({
  getImageProps: ({ src }: { src: string }) => ({
    props: {
      src: `${src}?width=2400`,
      srcSet: `${src}?width=640 640w, ${src}?width=1280 1280w`,
    },
  }),
}))

const image = {
  url: 'https://project.supabase.co/storage/v1/object/public/study-assets/11111111-1111-4111-8111-111111111111/backgrounds/22222222-2222-4222-8222-222222222222.webp',
  path: '11111111-1111-4111-8111-111111111111/backgrounds/22222222-2222-4222-8222-222222222222.webp',
  filename: 'background.webp',
  size: 1024,
  mimeType: 'image/webp' as const,
}

function branding(layout: 'fill' | 'fit' | 'tile'): BrandingSettings {
  return {
    background: {
      mode: 'image',
      image,
      layout,
      position: 'bottom-right',
      overlayOpacity: 20,
      contentSurface: 'glass',
    },
  }
}

describe('StudyBackgroundLayer', () => {
  it('renders an assistive-technology-hidden, responsive Fill image', () => {
    const markup = renderToStaticMarkup(
      <StudyBackgroundLayer branding={branding('fill')} />,
    )

    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('data-study-background-layer')
    expect(markup).toContain('srcSet=')
    expect(markup).toContain('object-fit:cover')
    expect(markup).toContain('object-position:bottom right')
  })

  it('uses the validated original asset for Tile without a responsive img', () => {
    const markup = renderToStaticMarkup(
      <StudyBackgroundLayer branding={branding('tile')} />,
    )

    expect(markup).toContain('background-image:url(')
    expect(markup).toContain(encodeURI(image.url))
    expect(markup).not.toContain('<img')
    expect(markup).toContain('opacity:0.2')
  })

  it('does not render an image for legacy/theme branding', () => {
    const markup = renderToStaticMarkup(
      <StudyBackgroundLayer branding={{ backgroundColor: '#FF0000' }} />,
    )
    expect(markup).not.toContain('<img')
    expect(markup).not.toContain('background-image')
  })
})

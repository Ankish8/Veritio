import { describe, expect, it } from 'vitest'
import type { BrandingSettings } from '@/components/builders/shared/types'
import {
  getBackgroundObjectPosition,
  getReplacedBackgroundAssetPath,
  getStudyBackgroundCssVariables,
  resolveStudyBackground,
} from './study-background'

const image = {
  url: 'https://example.supabase.co/storage/v1/object/public/study-assets/study/backgrounds/a.webp',
  path: 'study/backgrounds/a.webp',
  filename: 'a.webp',
  size: 1024,
  mimeType: 'image/webp' as const,
  width: 1600,
  height: 900,
}

describe('study background resolver', () => {
  it('preserves the theme when background is absent and ignores legacy backgroundColor', () => {
    expect(resolveStudyBackground({ backgroundColor: '#FF0000' })).toEqual({
      mode: 'theme',
      layout: 'fill',
      position: 'center',
      overlayOpacity: 0,
      contentSurface: 'solid',
      isCustomized: false,
    })
  })

  it('normalizes image defaults and clamps overlay opacity', () => {
    const branding = {
      background: {
        mode: 'image',
        image,
        layout: 'fill',
        position: 'bottom-right',
        overlayOpacity: 92,
        contentSurface: 'glass',
      },
    } satisfies BrandingSettings

    expect(resolveStudyBackground(branding)).toMatchObject({
      mode: 'image',
      image,
      layout: 'fill',
      position: 'bottom-right',
      overlayOpacity: 60,
      contentSurface: 'glass',
      isCustomized: true,
    })
  })

  it('falls back from a missing image to its configured color', () => {
    const branding = {
      background: {
        mode: 'image',
        color: '#aabbcc',
        layout: 'fit',
        position: 'top-left',
        overlayOpacity: 20,
        contentSurface: 'glass',
      },
    } as BrandingSettings

    expect(resolveStudyBackground(branding)).toMatchObject({
      mode: 'color',
      color: '#AABBCC',
      overlayOpacity: 0,
      contentSurface: 'solid',
    })
  })

  it('limits Glass to valid image backgrounds', () => {
    const themeGlass = {
      background: {
        mode: 'theme',
        layout: 'fill',
        position: 'center',
        overlayOpacity: 0,
        contentSurface: 'glass',
      },
    } satisfies BrandingSettings
    const colorGlass = {
      background: {
        mode: 'color',
        color: '#112233',
        layout: 'fill',
        position: 'center',
        overlayOpacity: 0,
        contentSurface: 'glass',
      },
    } satisfies BrandingSettings

    expect(resolveStudyBackground(themeGlass).contentSurface).toBe('solid')
    expect(resolveStudyBackground(colorGlass).contentSurface).toBe('solid')
  })

  it('maps all nine focal positions to CSS object positions', () => {
    expect([
      'top-left',
      'top-center',
      'top-right',
      'center-left',
      'center',
      'center-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
    ].map((position) => getBackgroundObjectPosition(position as never))).toEqual([
      'top left',
      'top center',
      'top right',
      'center left',
      'center',
      'center right',
      'bottom left',
      'bottom center',
      'bottom right',
    ])
  })

  it('isolates page and content-surface variables for solid and glass modes', () => {
    const theme = { pageBackground: '#F8FAFC', cardBackground: '#FFFFFF' }
    const solid = getStudyBackgroundCssVariables(
      {
        background: {
          mode: 'color',
          color: '#112233',
          layout: 'fill',
          position: 'center',
          overlayOpacity: 0,
          contentSurface: 'solid',
        },
      },
      theme,
    )
    const glass = getStudyBackgroundCssVariables(
      {
        background: {
          mode: 'image',
          image,
          layout: 'tile',
          position: 'center',
          overlayOpacity: 20,
          contentSurface: 'glass',
        },
      },
      theme,
    )

    expect(solid['--style-page-bg']).toBe('#112233')
    expect(solid['--style-content-surface-bg']).toBe('#FFFFFF')
    expect(glass['--style-page-bg']).toBe('transparent')
    expect(glass['--style-content-surface-bg']).toContain('88%')
    expect(glass['--style-content-surface-bg-fallback']).toBe('#FFFFFF')
  })

  it('only cleans up a persisted image after its reference is replaced or removed', () => {
    const persisted = {
      background: {
        mode: 'image',
        image,
        layout: 'fill',
        position: 'center',
        overlayOpacity: 20,
        contentSurface: 'glass',
      },
    } satisfies BrandingSettings
    const replacement = {
      ...persisted,
      background: {
        ...persisted.background,
        image: {
          ...image,
          path: 'study/backgrounds/b.webp',
          url: 'https://example.supabase.co/storage/v1/object/public/study-assets/study/backgrounds/b.webp',
        },
      },
    } satisfies BrandingSettings

    expect(getReplacedBackgroundAssetPath(persisted, persisted)).toBeNull()
    expect(getReplacedBackgroundAssetPath(persisted, replacement)).toBe(image.path)
    expect(getReplacedBackgroundAssetPath(persisted, {
      background: {
        ...persisted.background,
        mode: 'theme',
        image: undefined,
      },
    })).toBe(image.path)
  })
})

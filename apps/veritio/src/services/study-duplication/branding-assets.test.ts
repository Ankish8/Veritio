import { describe, expect, it } from 'vitest'
import type { BrandingSettings } from '@/components/builders/shared/types'
import { planBrandingAssetDuplication } from './branding-assets'

const originalId = '11111111-1111-4111-8111-111111111111'
const newId = '22222222-2222-4222-8222-222222222222'
const publicBase = 'https://project.supabase.co/storage/v1/object/public/study-assets/'

describe('branding asset duplication', () => {
  it('copies and rewrites study-owned logo, social, and background assets', () => {
    const branding: BrandingSettings = {
      logo: {
        url: `${publicBase}${originalId}/logo/logo.png`,
        filename: 'logo.png',
      },
      socialImage: {
        url: `${publicBase}${originalId}/social/social.webp`,
        filename: 'social.webp',
      },
      background: {
        mode: 'image',
        image: {
          url: `${publicBase}${originalId}/backgrounds/background.jpg`,
          path: `${originalId}/backgrounds/background.jpg`,
          filename: 'background.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
        },
        layout: 'fill',
        position: 'center',
        overlayOpacity: 20,
        contentSurface: 'glass',
      },
    }

    const result = planBrandingAssetDuplication(branding, originalId, newId)

    expect(result.copies).toHaveLength(3)
    expect(result.branding?.background?.image?.path).toBe(
      `${newId}/backgrounds/background.jpg`,
    )
    expect(result.branding?.logo?.url).toContain(`${newId}/logo/logo.png`)
    expect(branding.background?.image?.path).toContain(originalId)
  })

  it('preserves external/shared assets without copying them', () => {
    const branding: BrandingSettings = {
      logo: {
        url: 'https://cdn.example.com/shared-logo.png',
        filename: 'shared-logo.png',
      },
    }

    const result = planBrandingAssetDuplication(branding, originalId, newId)

    expect(result.copies).toEqual([])
    expect(result.branding).toEqual(branding)
  })
})

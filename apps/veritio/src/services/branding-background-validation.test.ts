import { afterEach, describe, expect, it } from 'vitest'
import { brandingSchema } from './types'

const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const studyId = '11111111-1111-4111-8111-111111111111'
const assetId = '22222222-2222-4222-8222-222222222222'
const path = `${studyId}/backgrounds/${assetId}.webp`

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl
})

describe('branding background schema', () => {
  it('accepts the nested study-owned image contract', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    expect(brandingSchema.safeParse({
      background: {
        mode: 'image',
        color: '#112233',
        image: {
          url: `https://project.supabase.co/storage/v1/object/public/study-assets/${path}`,
          path,
          filename: 'background.webp',
          size: 1024,
          mimeType: 'image/webp',
          width: 1600,
          height: 900,
        },
        layout: 'fill',
        position: 'center',
        overlayOpacity: 20,
        contentSurface: 'glass',
      },
    }).success).toBe(true)
  })

  it('rejects external URLs, oversized assets, and overlay values over 60', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
    const result = brandingSchema.safeParse({
      background: {
        mode: 'image',
        image: {
          url: `https://cdn.example.com/${path}`,
          path,
          filename: 'background.webp',
          size: 5 * 1024 * 1024 + 1,
          mimeType: 'image/webp',
        },
        layout: 'fit',
        position: 'top-right',
        overlayOpacity: 61,
        contentSurface: 'solid',
      },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          'Background URL must match the study-owned storage path',
          'Number must be less than or equal to 5242880',
          'Number must be less than or equal to 60',
        ]),
      )
    }
  })

  it('continues accepting legacy backgroundColor without activating it', () => {
    expect(brandingSchema.safeParse({ backgroundColor: '#123456' }).success).toBe(true)
  })
})

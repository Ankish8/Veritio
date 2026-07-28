import { beforeEach, describe, expect, it } from 'vitest'
import { useStudyMetaStore } from './study-meta-store'

const image = {
  url: 'https://project.supabase.co/storage/v1/object/public/study-assets/11111111-1111-4111-8111-111111111111/backgrounds/22222222-2222-4222-8222-222222222222.webp',
  path: '11111111-1111-4111-8111-111111111111/backgrounds/22222222-2222-4222-8222-222222222222.webp',
  filename: 'background.webp',
  size: 1024,
  mimeType: 'image/webp' as const,
}

beforeEach(() => {
  useStudyMetaStore.getState().reset()
})

describe('study meta background actions', () => {
  it('notifies subscribers when metadata hydration releases autosave', async () => {
    let observedHydration = false
    const unsubscribe = useStudyMetaStore.subscribe((state, previous) => {
      if (!previous.isHydrated && state.isHydrated) observedHydration = true
    })

    await useStudyMetaStore.persist.rehydrate()
    unsubscribe()

    expect(useStudyMetaStore.getState().isHydrated).toBe(true)
    expect(observedHydration).toBe(true)
  })

  it('updates nested background fields without losing the image reference', () => {
    useStudyMetaStore.getState().setStudyBackground({
      mode: 'image',
      image,
      layout: 'fill',
      position: 'center',
      overlayOpacity: 20,
      contentSurface: 'glass',
    })
    useStudyMetaStore.getState().updateStudyBackground({
      layout: 'fit',
      position: 'top-right',
    })

    expect(useStudyMetaStore.getState().meta.branding.background).toMatchObject({
      mode: 'image',
      image,
      layout: 'fit',
      position: 'top-right',
      overlayOpacity: 20,
      contentSurface: 'glass',
    })
  })

  it('removes the image into a customized color fallback or Theme', () => {
    useStudyMetaStore.getState().setStudyBackground({
      mode: 'image',
      color: '#112233',
      image,
      layout: 'fill',
      position: 'center',
      overlayOpacity: 20,
      contentSurface: 'glass',
    })
    useStudyMetaStore.getState().removeStudyBackgroundImage()

    expect(useStudyMetaStore.getState().meta.branding.background).toMatchObject({
      mode: 'color',
      color: '#112233',
      overlayOpacity: 0,
      contentSurface: 'solid',
    })
    expect(useStudyMetaStore.getState().meta.branding.background?.image).toBeUndefined()

    useStudyMetaStore.getState().setStudyBackground({
      mode: 'image',
      image,
      layout: 'fill',
      position: 'center',
      overlayOpacity: 20,
      contentSurface: 'glass',
    })
    useStudyMetaStore.getState().removeStudyBackgroundImage()

    expect(useStudyMetaStore.getState().meta.branding.background?.mode).toBe('theme')
    expect(useStudyMetaStore.getState().meta.branding.background?.image).toBeUndefined()
  })
})

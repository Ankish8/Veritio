import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BackgroundSection } from './background-section'

const studyId = '11111111-1111-4111-8111-111111111111'

const storeState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}))

vi.mock('@/stores/study-meta-store', () => ({
  useStudyMetaStore: () => storeState.value,
}))

vi.mock('@/components/ui/slider', () => ({
  Slider: ({
    thumbAriaLabel,
    disabled,
  }: {
    thumbAriaLabel?: string
    disabled?: boolean
  }) => (
    <input
      type="range"
      role="slider"
      aria-label={thumbAriaLabel}
      disabled={disabled}
    />
  ),
}))

beforeEach(() => {
  storeState.value = {
    meta: {
      branding: {
        background: {
          mode: 'image',
          image: {
            url: `https://project.supabase.co/storage/v1/object/public/study-assets/${studyId}/backgrounds/background.webp`,
            path: `${studyId}/backgrounds/background.webp`,
            filename: 'background.webp',
            size: 1024,
            mimeType: 'image/webp',
          },
          layout: 'fill',
          position: 'center',
          overlayOpacity: 20,
          contentSurface: 'glass',
        },
      },
    },
    saveStatus: 'idle',
    updateStudyBackground: vi.fn(),
    removeStudyBackgroundImage: vi.fn(),
  }
})

function renderSection(isReadOnly = false): HTMLElement {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(
    <BackgroundSection studyId={studyId} isReadOnly={isReadOnly} />,
  )
  return container
}

describe('BackgroundSection', () => {
  it('labels the keyboard-focusable overlay slider and constrains file input types', () => {
    const section = renderSection()
    const slider = section.querySelector('[role="slider"]')
    const fileInput = section.querySelector<HTMLInputElement>('input[type="file"]')

    expect(slider?.getAttribute('aria-label')).toBe('Background overlay opacity')
    expect(fileInput?.accept).toBe('image/png,image/jpeg,image/webp')
  })

  it('disables every interactive background control in read-only studies', () => {
    const section = renderSection(true)
    const controls = Array.from(
      section.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input'),
    )

    expect(controls.length).toBeGreaterThan(10)
    expect(controls.every((control) => control.disabled)).toBe(true)
  })

  it('only offers Solid and Glass for image backgrounds', () => {
    const imageSection = renderSection()
    expect(imageSection.textContent).toContain('Content surface')
    expect(imageSection.textContent).toContain('Glass')

    storeState.value = {
      ...storeState.value,
      meta: {
        branding: {
          background: {
            mode: 'theme',
            layout: 'fill',
            position: 'center',
            overlayOpacity: 0,
            contentSurface: 'glass',
          },
        },
      },
    }

    const themeSection = renderSection()
    expect(themeSection.textContent).not.toContain('Content surface')
    expect(themeSection.textContent).not.toContain('Glass')
  })

  it('offers only Color and Image, seeding the picker from the theme', () => {
    storeState.value = {
      ...storeState.value,
      meta: {
        branding: {
          background: {
            mode: 'theme',
            layout: 'fill',
            position: 'center',
            overlayOpacity: 0,
            contentSurface: 'solid',
          },
        },
      },
    }

    const section = renderSection()
    const kinds = Array.from(
      section.querySelectorAll('[aria-label="Background type"] button'),
    ).map((button) => button.textContent)
    const hex = section.querySelector<HTMLInputElement>(
      'input[aria-label="Background hex color"]',
    )

    expect(kinds).toEqual(['Color', 'Image'])
    // The default preset's light page background, not a hardcoded fallback.
    expect(hex?.getAttribute('value')).toBe('#F8FAFC')
    expect(section.textContent).toContain('Following the light theme')
    expect(section.textContent).not.toContain('Match theme')
  })

  it('surfaces the theme reset only once a hex is pinned', () => {
    storeState.value = {
      ...storeState.value,
      meta: {
        branding: {
          themeMode: 'dark',
          background: {
            mode: 'color',
            color: '#112233',
            layout: 'fill',
            position: 'center',
            overlayOpacity: 0,
            contentSurface: 'solid',
          },
        },
      },
    }

    const section = renderSection()
    const hex = section.querySelector<HTMLInputElement>(
      'input[aria-label="Background hex color"]',
    )

    expect(hex?.getAttribute('value')).toBe('#112233')
    expect(section.textContent).toContain('Match theme')
    expect(section.textContent).toContain('both light and dark themes')
  })
})

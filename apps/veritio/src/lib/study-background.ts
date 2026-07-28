import type {
  BrandingSettings,
  StudyBackgroundLayout,
  StudyBackgroundPosition,
  StudyBackgroundSettings,
  StudyContentSurface,
} from '@/components/builders/shared/types'

export const BACKGROUND_MAX_OVERLAY = 60
export const DEFAULT_BACKGROUND_COLOR = '#F8FAFC'

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const BACKGROUND_LAYOUTS = new Set<StudyBackgroundLayout>(['fill', 'fit', 'tile'])
const BACKGROUND_POSITIONS = new Set<StudyBackgroundPosition>([
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
])
const CONTENT_SURFACES = new Set<StudyContentSurface>(['solid', 'glass'])

export interface ResolvedStudyBackground {
  mode: 'theme' | 'color' | 'image'
  color?: string
  image?: StudyBackgroundSettings['image']
  layout: StudyBackgroundLayout
  position: StudyBackgroundPosition
  overlayOpacity: number
  contentSurface: StudyContentSurface
  isCustomized: boolean
}

export interface BackgroundThemeVariables {
  pageBackground: string
  cardBackground: string
}

export function getReplacedBackgroundAssetPath(
  persistedBranding: BrandingSettings | null | undefined,
  nextBranding: BrandingSettings | null | undefined,
): string | null {
  const persistedPath = persistedBranding?.background?.image?.path
  const nextPath = nextBranding?.background?.image?.path
  return persistedPath && persistedPath !== nextPath ? persistedPath : null
}

export function isValidBackgroundColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value)
}

function normalizeOverlay(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(BACKGROUND_MAX_OVERLAY, Math.max(0, value))
}

/**
 * Normalizes researcher-authored branding defensively at every render boundary.
 * Legacy `backgroundColor` is intentionally not read here.
 */
export function resolveStudyBackground(
  branding: BrandingSettings | null | undefined,
): ResolvedStudyBackground {
  const background = branding?.background
  if (!background) {
    return {
      mode: 'theme',
      layout: 'fill',
      position: 'center',
      overlayOpacity: 0,
      contentSurface: 'solid',
      isCustomized: false,
    }
  }

  const requestedMode = background.mode
  const color = isValidBackgroundColor(background.color)
    ? background.color.toUpperCase()
    : undefined
  const layout = BACKGROUND_LAYOUTS.has(background.layout)
    ? background.layout
    : 'fill'
  const position = BACKGROUND_POSITIONS.has(background.position)
    ? background.position
    : 'center'
  const contentSurface = CONTENT_SURFACES.has(background.contentSurface)
    ? background.contentSurface
    : requestedMode === 'image'
      ? 'glass'
      : 'solid'

  if (
    requestedMode === 'image' &&
    background.image?.url &&
    background.image.path
  ) {
    return {
      mode: 'image',
      color,
      image: background.image,
      layout,
      position,
      overlayOpacity: normalizeOverlay(background.overlayOpacity),
      contentSurface,
      isCustomized: true,
    }
  }

  if (requestedMode === 'color' || (requestedMode === 'image' && color)) {
    return {
      mode: color ? 'color' : 'theme',
      color,
      layout,
      position,
      overlayOpacity: 0,
      contentSurface,
      isCustomized: !!color,
    }
  }

  return {
    mode: 'theme',
    layout,
    position,
    overlayOpacity: 0,
    contentSurface,
    isCustomized: contentSurface === 'glass',
  }
}

export function getBackgroundObjectPosition(
  position: StudyBackgroundPosition,
): string {
  return position.replace('-', ' ')
}

export function getStudyBackgroundCssVariables(
  branding: BrandingSettings | null | undefined,
  theme: BackgroundThemeVariables,
): Record<string, string> {
  const background = resolveStudyBackground(branding)
  const fallback =
    background.mode === 'theme'
      ? theme.pageBackground
      : background.color || theme.pageBackground
  const pageBackground =
    background.mode === 'image'
      ? 'transparent'
      : fallback
  const glassBackground = `color-mix(in srgb, ${theme.cardBackground} 88%, transparent)`

  return {
    '--style-page-bg': pageBackground,
    '--study-background-fallback': fallback,
    '--style-content-surface-bg-fallback': theme.cardBackground,
    '--style-content-surface-bg':
      background.contentSurface === 'glass'
        ? glassBackground
        : theme.cardBackground,
    '--style-content-surface-backdrop-filter':
      background.contentSurface === 'glass'
        ? 'blur(16px) saturate(120%)'
        : 'none',
  }
}

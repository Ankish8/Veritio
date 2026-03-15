'use client'

import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react'
import type {
  BrandingSettings,
  StylePresetId,
  RadiusOption,
} from '@/components/builders/shared/types'
import {
  generateBrandPalette,
  generateDarkBrandPalette,
  type BrandPalette,
} from '@/lib/brand-colors'
import { getPresetCSSVariables, getPresetDarkVariables } from '@/lib/style-presets'
import { useTheme } from './theme-provider'

interface BrandingContextValue {
  isActive: boolean
  palette: BrandPalette | null
  lightPalette: BrandPalette | null
  darkPalette: BrandPalette | null
  stylePreset: StylePresetId
  radiusOption: RadiusOption
}

const BrandingContext = createContext<BrandingContextValue>({
  isActive: false,
  palette: null,
  lightPalette: null,
  darkPalette: null,
  stylePreset: 'default',
  radiusOption: 'default',
})

export function useBrandingContext() {
  return useContext(BrandingContext)
}

interface BrandingProviderProps {
  branding: BrandingSettings | null | undefined
  children: ReactNode
}

// Style tag ID for cleanup
const BRANDING_STYLE_ID = 'branding-provider-styles'
// Favicon link ID for cleanup
const BRANDING_FAVICON_ID = 'branding-favicon'

// IMPORTANT: For dark mode, we inject a <style> tag with .dark rules to override
// the fallback values in globals.css. This is necessary because:
// 1. ThemeProvider wraps content in <div className="dark">
// 2. globals.css has .dark { --style-card-bg: ... } fallback definitions
// 3. Without this, the .dark class would shadow our preset-specific values
export function BrandingProvider({ branding, children }: BrandingProviderProps) {
  // Get current theme from ThemeProvider
  const { resolvedTheme } = useTheme()

  // Get style settings with defaults
  const stylePreset = branding?.stylePreset || 'default'
  const radiusOption = branding?.radiusOption || 'default'

  // Generate both light and dark palettes from primary color
  const lightPalette = useMemo(() => { // eslint-disable-line react-hooks/preserve-manual-memoization
    if (!branding?.primaryColor) return null
    return generateBrandPalette(branding.primaryColor)
  }, [branding?.primaryColor])

  const darkPalette = useMemo(() => { // eslint-disable-line react-hooks/preserve-manual-memoization
    if (!branding?.primaryColor) return null
    return generateDarkBrandPalette(branding.primaryColor)
  }, [branding?.primaryColor])

  // Select the appropriate palette based on current theme
  const palette = resolvedTheme === 'dark' ? darkPalette : lightPalette

  // Get style preset CSS variables for both light and dark modes
  const lightStyleVariables = useMemo(() => {
    return getPresetCSSVariables(stylePreset, radiusOption)
  }, [stylePreset, radiusOption])

  const darkStyleVariables = useMemo(() => {
    const darkVars = getPresetDarkVariables(stylePreset)
    // Apply radius override if needed
    if (radiusOption && radiusOption !== 'default') {
      const baseRadius =
        radiusOption === 'none' ? 0 : radiusOption === 'small' ? 4 : 16
      return {
        ...darkVars,
        '--style-radius': `${baseRadius}px`,
        '--style-radius-sm': `${Math.max(0, baseRadius - 4)}px`,
        '--style-radius-lg': `${baseRadius + 4}px`,
        '--style-radius-xl': `${baseRadius + 8}px`,
        '--style-button-radius': `${baseRadius}px`,
      }
    }
    return darkVars
  }, [stylePreset, radiusOption])

  // Inject CSS custom properties via a <style> tag
  // This approach properly handles the .dark class scoping issue
  useEffect(() => {
    // Remove any existing style tag
    const existingStyle = document.getElementById(BRANDING_STYLE_ID)
    if (existingStyle) {
      existingStyle.remove()
    }

    // Build CSS rules for :root (light mode)
    const rootVars: string[] = []

    // Add brand color variables if we have a light palette
    if (lightPalette) {
      rootVars.push(`--brand: ${lightPalette.brand}`)
      rootVars.push(`--brand-hover: ${lightPalette.brandHover}`)
      rootVars.push(`--brand-muted: ${lightPalette.brandMuted}`)
      rootVars.push(`--brand-light: ${lightPalette.brandLight}`)
      rootVars.push(`--brand-subtle: ${lightPalette.brandSubtle}`)
      rootVars.push(`--brand-foreground: ${lightPalette.brandForeground}`)
    }

    // Add light mode style variables
    Object.entries(lightStyleVariables).forEach(([key, value]) => {
      rootVars.push(`${key}: ${value}`)
    })

    // Build CSS rules for .dark (dark mode)
    const darkVars: string[] = []

    // Add brand color variables for dark mode if we have a dark palette
    if (darkPalette) {
      darkVars.push(`--brand: ${darkPalette.brand}`)
      darkVars.push(`--brand-hover: ${darkPalette.brandHover}`)
      darkVars.push(`--brand-muted: ${darkPalette.brandMuted}`)
      darkVars.push(`--brand-light: ${darkPalette.brandLight}`)
      darkVars.push(`--brand-subtle: ${darkPalette.brandSubtle}`)
      darkVars.push(`--brand-foreground: ${darkPalette.brandForeground}`)
    }

    // Add dark mode style variables
    Object.entries(darkStyleVariables).forEach(([key, value]) => {
      darkVars.push(`${key}: ${value}`)
    })

    // Create and inject the style tag
    const styleTag = document.createElement('style')
    styleTag.id = BRANDING_STYLE_ID
    styleTag.textContent = `
      :root {
        ${rootVars.join(';\n        ')};
      }
      .dark {
        ${darkVars.join(';\n        ')};
      }
    `
    document.head.appendChild(styleTag)

    // Cleanup on unmount
    return () => {
      const styleToRemove = document.getElementById(BRANDING_STYLE_ID)
      if (styleToRemove) {
        styleToRemove.remove()
      }
    }
  }, [lightPalette, darkPalette, lightStyleVariables, darkStyleVariables])

  // Sync html/body background to branded page-bg for mobile overscroll areas
  useEffect(() => {
    const pageBg = resolvedTheme === 'dark'
      ? darkStyleVariables['--style-page-bg']
      : lightStyleVariables['--style-page-bg']
    if (pageBg) {
      document.documentElement.style.backgroundColor = pageBg
      document.body.style.backgroundColor = pageBg
    }
    return () => {
      document.documentElement.style.removeProperty('background-color')
      document.body.style.removeProperty('background-color')
    }
  }, [resolvedTheme, lightStyleVariables, darkStyleVariables])

  // Set favicon from logo if available
  useEffect(() => {
    const logoUrl = branding?.logo?.url

    if (!logoUrl) return

    // Store original favicon links for restoration
    const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    const originalFaviconData: Array<{ rel: string; href: string; type?: string }> = []

    // Remove all existing favicons and store their data
    existingFavicons.forEach((favicon) => {
      const link = favicon as HTMLLinkElement
      originalFaviconData.push({
        rel: link.rel,
        href: link.href,
        type: link.type || undefined,
      })
      link.remove() // Remove the existing favicon
    })

    // Create new favicon with the logo URL (with cache-busting)
    const faviconLink = document.createElement('link')
    faviconLink.id = BRANDING_FAVICON_ID
    faviconLink.rel = 'icon'
    faviconLink.href = `${logoUrl}?favicon=${Date.now()}`
    document.head.appendChild(faviconLink)

    // Cleanup on unmount - restore original favicons
    return () => {
      // Remove our custom favicon
      const createdFavicon = document.getElementById(BRANDING_FAVICON_ID)
      if (createdFavicon) {
        createdFavicon.remove()
      }

      // Restore original favicons
      originalFaviconData.forEach((data) => {
        const link = document.createElement('link')
        link.rel = data.rel
        link.href = data.href
        if (data.type) link.type = data.type
        document.head.appendChild(link)
      })
    }
  }, [branding?.logo?.url])

  const contextValue = useMemo(
    () => ({
      isActive: !!palette,
      palette,
      lightPalette,
      darkPalette,
      stylePreset,
      radiusOption,
    }),
    [palette, lightPalette, darkPalette, stylePreset, radiusOption]
  )

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  )
}
